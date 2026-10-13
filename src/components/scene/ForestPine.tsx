"use client";

import { useLayoutEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  Box3,
  DoubleSide,
  Mesh,
  Object3D,
  Texture,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";
import { isOutdoorRoadMesh, OUTDOOR_FOCUS } from "./outdoor-stage";

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

const carAnchor = new Vector3(0, 0, 0);
const bounds = new Box3();
const center = new Vector3();

function distanceXZToCar(mesh: Mesh) {
  bounds.setFromObject(mesh);
  bounds.getCenter(center);
  return Math.hypot(center.x - carAnchor.x, center.z - carAnchor.z);
}

function cullMeshesAroundCar(root: Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;

    const label = `${mesh.name} ${mesh.parent?.name ?? ""}`;
    if (isOutdoorRoadMesh(label)) {
      mesh.visible = true;
      return;
    }

    const dist = distanceXZToCar(mesh);
    if (/^Plane$/i.test(mesh.name) && dist > OUTDOOR_FOCUS.detailRadiusXZ) {
      mesh.visible = false;
      return;
    }

    mesh.visible = dist <= OUTDOOR_FOCUS.meshRadiusXZ;
  });
}

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
    mesh.visible = !grassy;
    mesh.castShadow = false;
    mesh.receiveShadow = !grassy;
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

export function ForestPine() {
  const { scene } = useGLTF(FOREST_PINE_URL);
  const [soilMap, soilNormal, soilRough] = useTexture([
    `/models/web/wet-soil.webp${ASSET_REV}`,
    `/models/web/wet-soil-normal.webp${ASSET_REV}`,
    `/models/web/wet-soil-mr.webp${ASSET_REV}`,
  ]);

  useLayoutEffect(() => {
    tuneForestMaterials(scene, soilMap, soilNormal, soilRough);
    cullMeshesAroundCar(scene);
  }, [scene, soilMap, soilNormal, soilRough]);

  return (
    <group position={PARK.position} rotation={PARK.rotation}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(FOREST_PINE_URL);
