"use client";

import { useLayoutEffect, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  DoubleSide,
  Group,
  Mesh,
  Object3D,
  Texture,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { useConfigurator } from "@/store/configurator-store";
import { cullDistantGrass, OUTDOOR_GRASS_CULL } from "./outdoor-stage";

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);

/** /models is served immutable (next.config.ts). Bump whenever a forest asset is re-exported. */
const ASSET_REV = "?v=2";

export const FOREST_PINE_URL = `/models/web/forest-pine.glb${ASSET_REV}`;
export const FOREST_GRASS_URL = `/models/web/forest-pine-grass.glb${ASSET_REV}`;
/** Road.blend Nishita world, baked by scripts/bake-forest-sky.py. */
export const FOREST_SKY_URL = "/sky/forest-pine-sky.hdr";

const SET_ENV_INTENSITY = 0.88;

const PARK = {
  position: [-1.25, -0.03, -18] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};

function tuneForestMaterials(
  root: Object3D,
  soilMap: Texture,
  soilNormal: Texture,
  soilRough: Texture,
) {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const grassy =
      /grass|wheat|leaves/i.test(mesh.name) ||
      materials.some((material) => /grass|wheat/i.test(material.name));
    // Solid preview cards in the base export; textured clumps live in forest-pine-grass.glb.
    mesh.visible = !grassy;
    mesh.castShadow = false;
    mesh.receiveShadow = !grassy;
    mesh.frustumCulled = true;
    if (grassy) return;

    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.envMapIntensity = SET_ENV_INTENSITY;
      material.vertexColors = false;
      material.needsUpdate = true;
      const name = material.name.toLowerCase();
      if (name.includes("soil")) {
        for (const texture of [soilMap, soilNormal, soilRough]) {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.anisotropy = 8;
          texture.needsUpdate = true;
        }
        soilMap.colorSpace = SRGBColorSpace;
        soilNormal.colorSpace = NoColorSpace;
        soilRough.colorSpace = NoColorSpace;
        material.map = soilMap;
        material.normalMap = soilNormal;
        material.normalScale.set(1, -1);
        material.roughnessMap = soilRough;
        material.metalnessMap = null;
        material.color.set("#ffffff");
        material.metalness = 0;
        material.roughness = 1;
      }
      if (!name.includes("twig")) continue;
      material.side = DoubleSide;
      material.transparent = false;
      material.depthWrite = true;
      material.alphaTest = Math.max(material.alphaTest, 0.4);
    }
  });
}

function tuneGrassMaterials(root: Object3D) {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.envMapIntensity = SET_ENV_INTENSITY;
      material.vertexColors = false;
      material.side = DoubleSide;
      material.transparent = false;
      material.depthWrite = true;
      material.alphaTest = Math.max(material.alphaTest, 0.2);
      material.needsUpdate = true;
    }
  });
}

export function ForestPine() {
  const groupRef = useRef<Group>(null);
  const sceneNavigating = useConfigurator((s) => s.sceneNavigating);
  const { scene } = useGLTF(FOREST_PINE_URL);
  const { scene: grass } = useGLTF(FOREST_GRASS_URL);
  const [soilMap, soilNormal, soilRough] = useTexture([
    `/models/web/wet-soil.webp${ASSET_REV}`,
    `/models/web/wet-soil-normal.webp${ASSET_REV}`,
    `/models/web/wet-soil-mr.webp${ASSET_REV}`,
  ]);

  const grassCullRadius = sceneNavigating
    ? OUTDOOR_GRASS_CULL.radiusNavigatingXZ
    : OUTDOOR_GRASS_CULL.radiusXZ;

  useLayoutEffect(() => {
    groupRef.current?.updateMatrixWorld(true);
    tuneForestMaterials(scene, soilMap, soilNormal, soilRough);
  }, [scene, soilMap, soilNormal, soilRough]);

  useLayoutEffect(() => {
    groupRef.current?.updateMatrixWorld(true);
    tuneGrassMaterials(grass);
    cullDistantGrass(grass, grassCullRadius);
  }, [grass, grassCullRadius]);

  return (
    <group ref={groupRef} position={PARK.position} rotation={PARK.rotation}>
      <primitive object={scene} />
      <primitive object={grass} />
    </group>
  );
}

useGLTF.preload(FOREST_PINE_URL);
useGLTF.preload(FOREST_GRASS_URL);
