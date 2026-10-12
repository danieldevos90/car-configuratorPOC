"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);
import { ThreeEvent } from "@react-three/fiber";
import { Box3, Group, Object3D, Vector3 } from "three";
import type { VehicleDefinition } from "@/config/catalog";
import { calipers, interiors, paints } from "@/config/finishes";
import {
  applyConfiguratorMaterials,
  collectNamedNodes,
  findNamedAncestor,
  sanitizeVehicleMaterials,
  setNamedVisibility,
} from "@/lib/materials";
import { useConfigurator } from "@/store/configurator-store";

type VehicleProps = {
  vehicle: VehicleDefinition;
  url: string;
};

export function Vehicle({ vehicle, url }: VehicleProps) {
  const { scene } = useGLTF(url);
  const group = useRef<Group>(null);
  const namedRef = useRef<Map<string, Object3D>>(new Map());

  const paintId = useConfigurator((s) => s.paintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const lightsOn = useConfigurator((s) => s.lightsOn);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const setSelectedPart = useConfigurator((s) => s.setSelectedPart);
  const setVehicleRadius = useConfigurator((s) => s.setVehicleRadius);

  useLayoutEffect(() => {
    scene.traverse((child) => {
      child.castShadow = false;
      child.receiveShadow = false;
    });
    sanitizeVehicleMaterials(scene, vehicle);
    namedRef.current = collectNamedNodes(scene);
  }, [scene, vehicle]);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.position.set(0, 0, 0);
    const box = new Box3().setFromObject(root);
    const center = box.getCenter(new Vector3());
    root.position.set(-center.x, -box.min.y, -center.z);
    box.setFromObject(root);
    const sized = box.getSize(new Vector3());
    const radius = 0.5 * Math.hypot(sized.x, sized.y, sized.z);
    if (radius > 0.2) setVehicleRadius(radius);
  }, [scene, setVehicleRadius]);

  useEffect(() => {
    const paint = paints.find((p) => p.id === paintId) ?? paints[0];
    const interior = interiors.find((p) => p.id === interiorId) ?? interiors[0];
    const caliper = calipers.find((p) => p.id === caliperId) ?? calipers[0];
    applyConfiguratorMaterials(scene, vehicle, {
      paint,
      interior,
      caliper,
      lightsOn,
    });
  }, [scene, vehicle, paintId, interiorId, caliperId, lightsOn]);

  useEffect(() => {
    const hidden = new Set(hiddenPartIds);
    for (const part of vehicle.parts) {
      setNamedVisibility(namedRef.current, part.nodeNames, !hidden.has(part.id));
    }
  }, [hiddenPartIds, vehicle, scene]);

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

  return (
    <group
      ref={group}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={onPointerDown}
    >
      <primitive object={scene} />
    </group>
  );
}
