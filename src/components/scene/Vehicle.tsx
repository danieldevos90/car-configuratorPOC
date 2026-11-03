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
import { ThreeEvent, useThree } from "@react-three/fiber";
import {
  Box3,
  Group,
  Object3D,
  PerspectiveCamera,
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
    child.castShadow = false;
    child.receiveShadow = false;
  });
  sanitizeVehicleMaterials(scene, vehicle);
  const maxAniso = gl.capabilities.getMaxAnisotropy();
  const anisotropy =
    !isCompactDevice || highDetail ? maxAniso : Math.min(8, maxAniso);
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

/**
 * Wheel sets are grouped by component (tyres, rims, nuts), not per wheel, so
 * frame the corner of the set that faces the camera.
 */
function facingQuarter(box: Box3, view: PartView): Box3 {
  const center = box.getCenter(new Vector3());
  const x = Math.sin(view.azimuth) >= 0;
  const z = Math.cos(view.azimuth) >= 0;
  return new Box3(
    new Vector3(x ? center.x : box.min.x, box.min.y, z ? center.z : box.min.z),
    new Vector3(x ? box.max.x : center.x, box.max.y, z ? box.max.z : center.z),
  );
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
  const distance = Math.min(12, Math.max(controls.minDistance, (radius / Math.sin(fov / 2)) * 1.15));
  const s = Math.sin(view.polar);
  void controls.setLookAt(
    target.x + distance * s * Math.sin(view.azimuth),
    target.y + distance * Math.cos(view.polar),
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
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null;
  const group = useRef<Group>(null);
  const namedRef = useRef<Map<string, Object3D>>(new Map());

  const paintId = useConfigurator((s) => s.paintId);
  const contrastPaintId = useConfigurator((s) => s.contrastPaintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const lightsOn = useConfigurator((s) => s.lightsOn);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
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
    const options = { paint, contrast, interior, caliper, lightsOn };
    applyConfiguratorMaterials(baseScene, vehicle, options);
    if (kitScene) applyConfiguratorMaterials(kitScene, vehicle, options);
  }, [
    baseScene,
    kitScene,
    vehicle,
    paintId,
    contrastPaintId,
    interiorId,
    caliperId,
    lightsOn,
  ]);

  useEffect(() => {
    const hidden = new Set(hiddenPartIds);
    // Options can share nodes (finish variants), so hide first and let any visible option win.
    for (const visible of [false, true]) {
      for (const part of vehicle.parts) {
        if (hidden.has(part.id) === visible) continue;
        const root = sceneForPart(part, baseScene, kitScene);
        if (root) setPartVisibility(root, part, visible);
      }
    }
    updateContacts();
  }, [hiddenPartIds, vehicle, baseScene, kitScene, updateContacts]);

  useEffect(() => {
    const paint = paints.find((p) => p.id === paintId) ?? paints[0];
    const contrast = paints.find((p) => p.id === contrastPaintId) ?? paint;
    const hidden = new Set(hiddenPartIds);
    applyPartFinishes(baseScene, vehicle, hidden, { paint, contrast });
    if (kitScene) applyPartFinishes(kitScene, vehicle, hidden, { paint, contrast });
  }, [hiddenPartIds, vehicle, baseScene, kitScene, paintId, contrastPaintId]);

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
    const framed =
      part.view.camera === "wheels" ? facingQuarter(box, part.view) : facingSide(box, part.view);
    flyTo(controls, camera, framed, part.view);
    // Only a new request (nonce) should move the camera, not part toggles alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce, controls]);

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

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > PICK_DRAG_TOLERANCE) return;
    const nodeName = findNamedAncestor(event.object, selectableNames);
    const candidates = nodeName ? partByNode.get(nodeName) ?? [] : [];
    const partId = candidates.find((id) => !hiddenPartIds.includes(id)) ?? candidates[0];
    if (partId) pickPart(partId);
    else setSelectedPart(null);
  };

  const outdoor = studioId === "road";
  const shadowY = outdoor ? 0.056 : 0.019;
  const shadowOpacity = outdoor ? 0.82 : 0.34;

  return (
    <>
      <group
        ref={group}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onClick}
      >
        <primitive object={baseScene} />
        {kitScene ? <primitive object={kitScene} /> : null}
      </group>
      <WheelContactShadows
        contacts={wheelContacts}
        y={shadowY}
        opacity={shadowOpacity}
      />
    </>
  );
}
