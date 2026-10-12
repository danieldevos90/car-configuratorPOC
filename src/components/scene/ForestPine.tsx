"use client";

import { useLayoutEffect } from "react";
import { useEnvironment, useGLTF, useTexture } from "@react-three/drei";
import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);

/** /models is served immutable (next.config.ts). Bump whenever a forest asset is re-exported. */
const ASSET_REV = "?v=2";

export const FOREST_PINE_URL = `/models/web/forest-pine.glb${ASSET_REV}`;
export const FOREST_GRASS_URL = `/models/web/forest-pine-grass.glb${ASSET_REV}`;
/** Road.blend Nishita world, baked by scripts/bake-forest-sky.py. */
export const FOREST_SKY_URL = "/sky/forest-pine-sky.hdr";
/**
 * Road.blend lights the set with that sky. The scene IBL is the green forest
 * preset, and three ignores envMapIntensity unless a material has its own envMap.
 */
const SET_ENV_URL = FOREST_SKY_URL;
const SET_ENV_INTENSITY = 0.85;

/**
 * The showcase is Z-up and the lane runs along +Y.
 * glTF export makes that (x, z, -y). This transform parks the lane
 * under the car: surface at y = 0, road running toward +Z.
 * Sampled on Tramac.002 at blender (-1.05, 18, 0.03), the clearest stretch.
 */
const PARK = {
  // X puts the carriageway centre under the car. Y keeps the asphalt at the tire contact.
  position: [-1.25, -0.03, -18] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};

export function ForestPine() {
  const { scene } = useGLTF(FOREST_PINE_URL);
  const { scene: grass } = useGLTF(FOREST_GRASS_URL);
  const [soilMap, soilNormal, soilRough] = useTexture([
    `/models/web/wet-soil.webp${ASSET_REV}`,
    `/models/web/wet-soil-normal.webp${ASSET_REV}`,
    `/models/web/wet-soil-mr.webp${ASSET_REV}`,
  ]);
  const setEnv = useEnvironment({ files: SET_ENV_URL });

  useLayoutEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const grassy =
        /grass|wheat|leaves/i.test(mesh.name) ||
        materials.some((material) => /grass|wheat/i.test(material.name));
      // The base export only has solid preview cards. Textured clumps replace them.
      mesh.visible = !grassy;
      mesh.castShadow = false;
      mesh.receiveShadow = !grassy;
      if (grassy) return;
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        material.envMap = setEnv;
        material.envMapIntensity = SET_ENV_INTENSITY;
        // Road.blend never reads its color attributes; glTF would multiply COLOR_0 into the albedo.
        material.vertexColors = false;
        material.needsUpdate = true;
        const name = material.name.toLowerCase();
        if (name.includes("soil")) {
          // Road.blend Soil shader: albedo, DirectX normal, packed metal/roughness.
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
  }, [scene, setEnv, soilMap, soilNormal, soilRough]);

  useLayoutEffect(() => {
    grass.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = true;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        material.envMap = setEnv;
        material.envMapIntensity = SET_ENV_INTENSITY;
        material.vertexColors = false;
        material.side = DoubleSide;
        material.transparent = false;
        material.depthWrite = true;
        material.alphaTest = Math.max(material.alphaTest, 0.2);
        material.needsUpdate = true;
      }
    });
  }, [grass, setEnv]);

  return (
    <group position={PARK.position} rotation={PARK.rotation}>
      <primitive object={scene} />
      <primitive object={grass} />
    </group>
  );
}

// Earlier sessions widened the cached grass instances in place.
useGLTF.clear(FOREST_GRASS_URL);
useGLTF.preload(FOREST_PINE_URL);
useGLTF.preload(FOREST_GRASS_URL);
