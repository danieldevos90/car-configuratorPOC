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
import {
  cullDistantGrass,
  FOREST_GRASS_URL,
  FOREST_PINE_URL,
  FOREST_SOIL_URLS,
  OUTDOOR_GRASS_CULL,
} from "./outdoor-stage";

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);

const SET_ENV_INTENSITY = 0.88;

const PARK = {
  position: [-1.25, -0.03, -18] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};

function tuneForestMaterials(
  root: Object3D,
  soil?: { map: Texture; normal: Texture; rough: Texture },
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
      if (name.includes("soil") && soil) {
        for (const texture of [soil.map, soil.normal, soil.rough]) {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.anisotropy = 8;
          texture.needsUpdate = true;
        }
        soil.map.colorSpace = SRGBColorSpace;
        soil.normal.colorSpace = NoColorSpace;
        soil.rough.colorSpace = NoColorSpace;
        material.map = soil.map;
        material.normalMap = soil.normal;
        material.normalScale.set(1, -1);
        material.roughnessMap = soil.rough;
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

function ForestSoil({ scene }: { scene: Object3D }) {
  const [soilMap, soilNormal, soilRough] = useTexture(FOREST_SOIL_URLS);

  useLayoutEffect(() => {
    tuneForestMaterials(scene, {
      map: soilMap,
      normal: soilNormal,
      rough: soilRough,
    });
  }, [scene, soilMap, soilNormal, soilRough]);

  return null;
}

function ForestGrass() {
  const sceneNavigating = useConfigurator((s) => s.sceneNavigating);
  const { scene: grass } = useGLTF(FOREST_GRASS_URL);
  const grassCullRadius = sceneNavigating
    ? OUTDOOR_GRASS_CULL.radiusNavigatingXZ
    : OUTDOOR_GRASS_CULL.radiusXZ;

  useLayoutEffect(() => {
    tuneGrassMaterials(grass);
    cullDistantGrass(grass, grassCullRadius);
  }, [grass, grassCullRadius]);

  return <primitive object={grass} />;
}

export function ForestPine() {
  const groupRef = useRef<Group>(null);
  const highDetail = useConfigurator((s) => s.highDetail);
  const { scene } = useGLTF(FOREST_PINE_URL);

  useLayoutEffect(() => {
    groupRef.current?.updateMatrixWorld(true);
    if (!highDetail) tuneForestMaterials(scene);
  }, [scene, highDetail]);

  return (
    <group ref={groupRef} position={PARK.position} rotation={PARK.rotation}>
      <primitive object={scene} />
      {highDetail ? <ForestSoil scene={scene} /> : null}
      {highDetail ? <ForestGrass /> : null}
    </group>
  );
}
