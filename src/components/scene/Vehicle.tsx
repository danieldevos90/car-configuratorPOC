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
import { ThreeEvent, useThree } from "@react-three/fiber";
import { Box3, Group, Object3D, Vector3, type WebGLRenderer } from "three";
import type { ConfigPart, VehicleDefinition } from "@/config/catalog";
import { calipers, interiors, paints } from "@/config/finishes";
import {
  applyConfiguratorMaterials,
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
  const group = useRef<Group>(null);
  const namedRef = useRef<Map<string, Object3D>>(new Map());

  const paintId = useConfigurator((s) => s.paintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const lightsOn = useConfigurator((s) => s.lightsOn);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const highDetail = useConfigurator((s) => s.highDetail);
  const textureMaxSize = useConfigurator((s) => s.textureMaxSize);
  const setSelectedPart = useConfigurator((s) => s.setSelectedPart);
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
    const interior = interiors.find((p) => p.id === interiorId) ?? interiors[0];
    const caliper = calipers.find((p) => p.id === caliperId) ?? calipers[0];
    const options = { paint, interior, caliper, lightsOn };
    applyConfiguratorMaterials(baseScene, vehicle, options);
    if (kitScene) applyConfiguratorMaterials(kitScene, vehicle, options);
  }, [baseScene, kitScene, vehicle, paintId, interiorId, caliperId, lightsOn]);

  useEffect(() => {
    const hidden = new Set(hiddenPartIds);
    for (const part of vehicle.parts) {
      const root = sceneForPart(part, baseScene, kitScene);
      if (!root) continue;
      setPartVisibility(root, part, !hidden.has(part.id));
    }
    updateContacts();
  }, [hiddenPartIds, vehicle, baseScene, kitScene, updateContacts]);

  const selectableNames = useMemo(() => {
    const names = new Set<string>();
    for (const part of vehicle.parts) {
      for (const name of part.nodeNames) names.add(name);
    }
    return names;
  }, [vehicle]);

  const partByNode = useMemo(() => {
    const map = new Map<string, string>();
    for (const part of vehicle.parts) {
      for (const name of part.nodeNames) map.set(name, part.id);
    }
    return map;
  }, [vehicle]);

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const nodeName = findNamedAncestor(event.object, selectableNames);
    if (!nodeName) {
      setSelectedPart(null);
      return;
    }
    setSelectedPart(partByNode.get(nodeName) ?? null);
  };

  const outdoor = studioId === "road";
  const shadowY = outdoor ? 0.056 : 0.019;
  const shadowOpacity = outdoor ? 0.82 : 0.34;

  return (
    <>
      <group
        ref={group}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={onPointerDown}
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
