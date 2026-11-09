"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGLTF } from "@react-three/drei";

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);
import type { CameraControlsImpl } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  Box3,
  Group,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type WebGLRenderer,
} from "three";
import type { ConfigPart, PartView, VehicleDefinition } from "@/config/catalog";
import { calipers, cameraPresets, interiors, paints } from "@/config/finishes";
import {
  applyConfiguratorMaterials,
  applyPartFinishes,
  collectNamedNodes,
  findNamedAncestor,
  sanitizeVehicleMaterials,
  setPartVisibility,
  tuneVehicleTextureSampling,
} from "@/lib/materials";
import { prepareModularVehicleAssembly } from "@/lib/align-modular-vehicle";
import { collectWheelContacts } from "@/lib/wheel-contacts";
import { useConfigurator } from "@/store/configurator-store";
import { WheelContactShadows } from "./WheelContactShadows";

type VehicleProps = {
  vehicle: VehicleDefinition;
  url: string;
  kitUrl?: string | null;
  onReady?: () => void;
};

function sceneForPart(
  part: ConfigPart,
  baseScene: Object3D,
  kitScene: Object3D | null,
): Object3D | null {
  if (part.module === "gelande") {
    return kitScene;
  }
  return baseScene;
}

function prepareScene(
  scene: Object3D,
  vehicle: VehicleDefinition,
  gl: WebGLRenderer,
  isCompactDevice: boolean,
  highDetail: boolean,
  textureMaxSize: number,
) {
  scene.traverse((child) => {
    child.castShadow = child.type === "Mesh" || child.type === "SkinnedMesh";
    child.receiveShadow = false;
  });
  sanitizeVehicleMaterials(scene, vehicle, isCompactDevice);
  const maxAniso = gl.capabilities.getMaxAnisotropy();
  const anisotropy = isCompactDevice
    ? 1
    : highDetail
      ? maxAniso
      : Math.min(8, maxAniso);
  tuneVehicleTextureSampling(scene, anisotropy, textureMaxSize);
}

/** Pixels the pointer may travel between down and up and still count as a pick, not an orbit. */
const PICK_DRAG_TOLERANCE = 5;

function partBox(root: Object3D, part: ConfigPart): Box3 | null {
  const box = new Box3();
  for (const name of part.nodeNames) {
    const node = root.getObjectByName(name);
    if (node) box.expandByObject(node);
  }
  return box.isEmpty() ? null : box;
}

/** Frame the whole slot so the camera holds still while switching options (and "None" has a target). */
function slotBox(root: Object3D, vehicle: VehicleDefinition, part: ConfigPart): Box3 | null {
  const slot = vehicle.exclusiveGroups?.find(
    (group) => group.required && group.partIds.includes(part.id),
  );
  if (!slot) return partBox(root, part);
  const box = new Box3();
  for (const id of slot.partIds) {
    const option = vehicle.parts.find((item) => item.id === id);
    const optionBox = option ? partBox(root, option) : null;
    if (optionBox) box.union(optionBox);
  }
  return box.isEmpty() ? null : box;
}

/** Left/right pairs (side steps, storage boxes) span the car; side views frame the near side only. */
function facingSide(box: Box3, view: PartView): Box3 {
  const side = Math.sin(view.azimuth);
  if (Math.abs(side) < 0.7 || box.min.x >= 0 || box.max.x <= 0) return box;
  const framed = box.clone();
  if (side > 0) framed.min.x = 0;
  else framed.max.x = 0;
  return framed;
}

const hubSample = new Vector3();

/**
 * Hub of the front tyre on the chosen side. The wheel meshes sit on the
 * ground; anything higher in the same node is the arch, not the hub.
 */
function frontHub(root: Object3D, part: ConfigPart, side: number): Vector3 | null {
  const samples: number[] = [];
  let minY = Infinity;
  const consider = (obj: Object3D) => {
    if (!(obj instanceof Mesh)) return;
    const attr = obj.geometry?.getAttribute("position");
    if (!attr) return;
    obj.updateWorldMatrix(true, false);
    const step = Math.max(1, Math.floor(attr.count / 8000));
    for (let i = 0; i < attr.count; i += step) {
      hubSample.fromBufferAttribute(attr, i).applyMatrix4(obj.matrixWorld);
      if (side > 0 ? hubSample.x < 0.15 : hubSample.x > -0.15) continue;
      if (hubSample.y < minY) minY = hubSample.y;
      samples.push(hubSample.x, hubSample.y, hubSample.z);
    }
  };
  for (const name of part.nodeNames) {
    const node = root.getObjectByName(name);
    if (!node) continue;
    node.updateWorldMatrix(true, true);
    node.traverse(consider);
  }
  if (!samples.length || !Number.isFinite(minY)) return null;
  const lowCut = minY + 0.78;
  let frontZ = -Infinity;
  for (let i = 0; i < samples.length; i += 3) {
    if (samples[i + 1] > lowCut) continue;
    if (samples[i + 2] > frontZ) frontZ = samples[i + 2];
  }
  if (!Number.isFinite(frontZ)) return null;
  const hub = new Vector3();
  let count = 0;
  let contactY = Infinity;
  for (let i = 0; i < samples.length; i += 3) {
    if (samples[i + 1] > lowCut) continue;
    if (samples[i + 2] < frontZ - 0.85) continue;
    hub.x += samples[i];
    hub.z += samples[i + 2];
    if (samples[i + 1] < contactY) contactY = samples[i + 1];
    count += 1;
  }
  if (!count) return null;
  hub.x /= count;
  hub.z /= count;
  hub.y = contactY + 0.39;
  return hub;
}

/**
 * Sit just above and outboard of the front hub so the rim face fills the
 * frame. A camera in front of the bumper looks at the valance instead.
 */
function flyToWheels(
  controls: CameraControlsImpl,
  root: Object3D,
  part: ConfigPart,
  view: PartView,
) {
  controls.minDistance = 0.8;
  controls.maxPolarAngle = 1.35;
  const side = Math.sin(view.azimuth) >= 0 ? 1 : -1;
  const hub = frontHub(root, part, side);
  if (!hub) return;
  void controls.setLookAt(
    hub.x + side * 2.15,
    hub.y + 0.72,
    hub.z + 0.12,
    hub.x,
    hub.y,
    hub.z,
    true,
  );
}

function flyTo(
  controls: CameraControlsImpl,
  camera: Camera,
  box: Box3,
  view: PartView,
) {
  const target = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const perspective = camera as PerspectiveCamera;
  const vfov = ((perspective.fov ?? 32) * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (perspective.aspect ?? 1));
  const fov = Math.min(vfov, hfov);
  const fill = 1.15;
  const distance = Math.min(
    12,
    Math.max(controls.minDistance, (radius / Math.sin(fov / 2)) * fill),
  );
  const s = Math.sin(view.polar);
  const cameraY = target.y + distance * Math.cos(view.polar);
  void controls.setLookAt(
    target.x + distance * s * Math.sin(view.azimuth),
    cameraY,
    target.z + distance * s * Math.cos(view.azimuth),
    target.x,
    target.y,
    target.z,
    true,
  );
}

export function Vehicle({ vehicle, url, kitUrl, onReady }: VehicleProps) {
  if (kitUrl) {
    return (
      <ModularVehicle
        vehicle={vehicle}
        baseUrl={url}
        kitUrl={kitUrl}
        onReady={onReady}
      />
    );
  }
  return <SingleVehicle vehicle={vehicle} url={url} onReady={onReady} />;
}

function SingleVehicle({
  vehicle,
  url,
  onReady,
}: {
  vehicle: VehicleDefinition;
  url: string;
  onReady?: () => void;
}) {
  const { scene } = useGLTF(url);
  return (
    <VehicleScene
      vehicle={vehicle}
      baseScene={scene}
      kitScene={null}
      onReady={onReady}
    />
  );
}

function ModularVehicle({
  vehicle,
  baseUrl,
  kitUrl,
  onReady,
}: {
  vehicle: VehicleDefinition;
  baseUrl: string;
  kitUrl: string;
  onReady?: () => void;
}) {
  const { scene: baseScene } = useGLTF(baseUrl);
  const { scene: kitScene } = useGLTF(kitUrl);
  return (
    <VehicleScene
      vehicle={vehicle}
      baseScene={baseScene}
      kitScene={kitScene}
      onReady={onReady}
    />
  );
}

function VehicleScene({
  vehicle,
  baseScene,
  kitScene,
  onReady,
}: {
  vehicle: VehicleDefinition;
  baseScene: Object3D;
  kitScene: Object3D | null;
  onReady?: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null;
  const group = useRef<Group>(null);
  const namedRef = useRef<Map<string, Object3D>>(new Map());

  const paintId = useConfigurator((s) => s.paintId);
  const contrastPaintId = useConfigurator((s) => s.contrastPaintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const lightsOn = useConfigurator((s) => s.lightsOn);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const cameraId = useConfigurator((s) => s.cameraId);
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const highDetail = useConfigurator((s) => s.highDetail);
  const textureMaxSize = useConfigurator((s) => s.textureMaxSize);
  const setSelectedPart = useConfigurator((s) => s.setSelectedPart);
  const pickPart = useConfigurator((s) => s.pickPart);
  const focusRequest = useConfigurator((s) => s.focusRequest);
  const setVehicleRadius = useConfigurator((s) => s.setVehicleRadius);
  const studioId = useConfigurator((s) => s.studioId);
  const [wheelContacts, setWheelContacts] = useState<Vector3[]>([]);

  useLayoutEffect(() => {
    if (kitScene) {
      prepareModularVehicleAssembly(baseScene, kitScene);
    }
    prepareScene(
      baseScene,
      vehicle,
      gl,
      isCompactDevice,
      highDetail,
      textureMaxSize,
    );
    if (kitScene) {
      prepareScene(
        kitScene,
        vehicle,
        gl,
        isCompactDevice,
        highDetail,
        textureMaxSize,
      );
    }
    const named = collectNamedNodes(baseScene);
    if (kitScene) {
      for (const [key, value] of collectNamedNodes(kitScene)) {
        named.set(key, value);
      }
    }
    namedRef.current = named;
  }, [
    baseScene,
    kitScene,
    vehicle,
    gl,
    isCompactDevice,
    highDetail,
    textureMaxSize,
  ]);

  const updateContacts = useCallback(() => {
    setWheelContacts(
      collectWheelContacts(baseScene, kitScene, vehicle, hiddenPartIds),
    );
  }, [baseScene, kitScene, vehicle, hiddenPartIds]);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);

    const baseBox = new Box3().setFromObject(baseScene);
    const center = baseBox.getCenter(new Vector3());
    root.position.set(-center.x, -baseBox.min.y, -center.z);

    const radiusBox = new Box3().setFromObject(baseScene);
    if (kitScene) radiusBox.union(new Box3().setFromObject(kitScene));
    const sized = radiusBox.getSize(new Vector3());
    const radius = 0.5 * Math.hypot(sized.x, sized.y, sized.z);
    if (radius > 0.2) setVehicleRadius(radius);
    updateContacts();
    onReady?.();
  }, [
    baseScene,
    kitScene,
    vehicle,
    setVehicleRadius,
    onReady,
    updateContacts,
  ]);

  useEffect(() => {
    const paint = paints.find((p) => p.id === paintId) ?? paints[0];
    const contrast = paints.find((p) => p.id === contrastPaintId) ?? paint;
    const interior = interiors.find((p) => p.id === interiorId) ?? interiors[0];
    const caliper = calipers.find((p) => p.id === caliperId) ?? calipers[0];
    const options = {
      paint,
      contrast,
      interior,
      caliper,
      lightsOn,
      liteGpu: isCompactDevice,
    };
    applyConfiguratorMaterials(baseScene, vehicle, options);
    if (kitScene) applyConfiguratorMaterials(kitScene, vehicle, options);
    invalidate();
  }, [
    baseScene,
    kitScene,
    vehicle,
    paintId,
    contrastPaintId,
    interiorId,
    caliperId,
    lightsOn,
    isCompactDevice,
    invalidate,
  ]);

  useEffect(() => {
    const hidden = new Set(hiddenPartIds);
    const cullCabin =
      isCompactDevice && cameraId !== "cabin";
    // Options can share nodes (finish variants), so hide first and let any visible option win.
    for (const visible of [false, true]) {
      for (const part of vehicle.parts) {
        const forcedOff =
          cullCabin && (part.category === "interior" || part.category === "mechanical");
        const show = !hidden.has(part.id) && !forcedOff;
        if (show !== visible) continue;
        const root = sceneForPart(part, baseScene, kitScene);
        if (root) setPartVisibility(root, part, visible);
      }
    }
    updateContacts();
    invalidate();
  }, [hiddenPartIds, vehicle, baseScene, kitScene, updateContacts, isCompactDevice, cameraId, invalidate]);

  useEffect(() => {
    const paint = paints.find((p) => p.id === paintId) ?? paints[0];
    const contrast = paints.find((p) => p.id === contrastPaintId) ?? paint;
    const hidden = new Set(hiddenPartIds);
    applyPartFinishes(baseScene, vehicle, hidden, { paint, contrast });
    if (kitScene) applyPartFinishes(kitScene, vehicle, hidden, { paint, contrast });
    invalidate();
  }, [hiddenPartIds, vehicle, baseScene, kitScene, paintId, contrastPaintId, invalidate]);

  useEffect(() => {
    if (!focusRequest || !controls) return;
    const preset = cameraPresets.find((item) => item.id === "hero")!;
    const part = focusRequest.partId
      ? vehicle.parts.find((item) => item.id === focusRequest.partId)
      : null;
    const box = part?.view ? slotBox(baseScene, vehicle, part) : null;
    if (!part?.view || !box) {
      const [x, y, z] = preset.position;
      const [tx, ty, tz] = preset.target;
      void controls.setLookAt(x, y, z, tx, ty, tz, true);
      return;
    }
    if (part.view.camera === "wheels") {
      if (cameraId === "wheels") return;
      const root = sceneForPart(part, baseScene, kitScene);
      if (root) flyToWheels(controls, root, part, part.view);
      return;
    }
    const framed = facingSide(box, part.view);
    flyTo(controls, camera, framed, part.view);
    // Only a new request (nonce) should move the camera, not part toggles alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce, controls]);

  useEffect(() => {
    if (cameraId !== "wheels" || !controls) return;
    const hidden = new Set(hiddenPartIds);
    const part = vehicle.parts.find(
      (item) => item.category === "wheels" && item.view?.camera === "wheels" && !hidden.has(item.id),
    );
    if (!part?.view) return;
    const root = sceneForPart(part, baseScene, kitScene);
    if (root) flyToWheels(controls, root, part, part.view);
    // Entering the wheels camera frames the front wheel once. Switching the rim stays put.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, controls]);

  /** Customer-facing parts only; inspector toggles (body, engine…) are not pickable. */
  const partByNode = useMemo(() => {
    const slotPartIds = new Set(
      (vehicle.exclusiveGroups ?? [])
        .filter((group) => group.required)
        .flatMap((group) => group.partIds),
    );
    const pickable = vehicle.parts.filter(
      (part) => part.accessory || slotPartIds.has(part.id),
    );
    const parts = pickable.length ? pickable : vehicle.parts;
    const map = new Map<string, string[]>();
    for (const part of parts) {
      for (const name of part.nodeNames) map.set(name, [...(map.get(name) ?? []), part.id]);
    }
    return map;
  }, [vehicle]);

  const selectableNames = useMemo(() => new Set(partByNode.keys()), [partByNode]);

  /** One-shot raycast on tap. R3F onClick would raycast the whole 6.5M-tri model on every pointermove. */
  useEffect(() => {
    const el = gl.domElement;
    const pointer = new Vector2();
    const raycaster = new Raycaster();
    const origin = { x: 0, y: 0 };
    const pickable: Object3D[] = [];
    for (const name of selectableNames) {
      const node = namedRef.current.get(name) ?? baseScene.getObjectByName(name);
      if (node) pickable.push(node);
    }

    const onDown = (event: PointerEvent) => {
      origin.x = event.clientX;
      origin.y = event.clientY;
    };
    const onUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > PICK_DRAG_TOLERANCE) {
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickable, true);
      const hit = hits.find((item) => item.object.visible);
      const nodeName = hit ? findNamedAncestor(hit.object, selectableNames) : null;
      const candidates = nodeName ? partByNode.get(nodeName) ?? [] : [];
      const partId =
        candidates.find((id) => !hiddenPartIds.includes(id)) ?? candidates[0];
      if (partId) pickPart(partId);
      else setSelectedPart(null);
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [
    gl,
    camera,
    selectableNames,
    partByNode,
    hiddenPartIds,
    pickPart,
    setSelectedPart,
    baseScene,
  ]);

  const outdoor = studioId === "road" || studioId === "alm" || studioId === "wald";
  const shadowY = outdoor ? 0.056 : 0.016;
  const shadowOpacity = outdoor ? 0.72 : 0.5;

  return (
    <>
      <group ref={group} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={baseScene} />
        {kitScene ? <primitive object={kitScene} /> : null}
      </group>
      {outdoor ? (
        <WheelContactShadows
          contacts={wheelContacts}
          y={shadowY}
          opacity={shadowOpacity}
          scale={0.52}
        />
      ) : null}
    </>
  );
}
