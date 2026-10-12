"use client";

import { Suspense, useMemo } from "react";
import { Cloud, Clouds, Environment } from "@react-three/drei";
import { CanvasTexture, MeshLambertMaterial } from "three";
import type { StudioId } from "@/config/finishes";
import { FOREST_SKY_URL, ForestPine } from "./ForestPine";
import { GarageFloor } from "./GarageFloor";

const ENV: Record<StudioId, "studio" | "apartment" | "night" | "warehouse" | "forest"> = {
  studio: "studio",
  showroom: "apartment",
  night: "night",
  garage: "warehouse",
  road: "forest",
};

const SKY = "#6eacdf";
const SKY_HAZE = "#9ec8ea";
const SKY_URL = FOREST_SKY_URL;

class SkyCloudMaterial extends MeshLambertMaterial {
  constructor() {
    super({ fog: false, depthWrite: false, transparent: true });
  }
}

/** Photographic sky only. Forest IBL stays on the car. */
function SkyPhoto() {
  return (
    <Environment
      files={SKY_URL}
      background="only"
      backgroundIntensity={0.95}
      backgroundRotation={[0, 0, 0]}
      environmentIntensity={0.85}
    />
  );
}

function SkyClouds() {
  return (
    <Clouds texture="/sky/cloud.png" material={SkyCloudMaterial} limit={80}>
      <Cloud
        seed={1}
        position={[-16, 10, -8]}
        bounds={[16, 2.4, 7]}
        volume={5}
        opacity={0.95}
        speed={0.04}
        segments={14}
        color="#ffffff"
      />
      <Cloud
        seed={4}
        position={[10, 11, -18]}
        bounds={[14, 2.2, 6]}
        volume={4.5}
        opacity={0.9}
        speed={0.03}
        segments={12}
        color="#f7fbff"
      />
      <Cloud
        seed={8}
        position={[-4, 12.5, -32]}
        bounds={[18, 2.6, 8]}
        volume={5.5}
        opacity={0.82}
        speed={0.025}
        segments={14}
        color="#ffffff"
      />
      <Cloud
        seed={12}
        position={[18, 9.5, 2]}
        bounds={[12, 2, 5]}
        volume={3.8}
        opacity={0.78}
        speed={0.03}
        segments={10}
        color="#ffffff"
      />
    </Clouds>
  );
}

/** Car footprint is 2.17 m wide and 4.80 m long. The blur lives inside this texture. */
function FootprintShadow({ opacity, y }: { opacity: number; y: number }) {
  const map = useMemo(() => {
    const width = 256;
    const height = 560;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000000";
    ctx.filter = "blur(26px)";
    ctx.beginPath();
    ctx.roundRect(46, 64, width - 92, height - 128, 46);
    ctx.fill();
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  if (!map) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={2}>
      <planeGeometry args={[2.28, 4.95]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        toneMapped={false}
        opacity={opacity}
      />
    </mesh>
  );
}

export function Studio({ studioId }: { studioId: StudioId }) {
  const showroom = studioId === "showroom";
  const night = studioId === "night";
  const garage = studioId === "garage";
  const road = studioId === "road";
  const bg = showroom ? "#f4f4f4" : road ? SKY_HAZE : garage ? "#1a1918" : "#000000";
  const floor = showroom ? "#ffffff" : night ? "#0a0a0a" : "#161616";

  return (
    <>
      {road ? (
        <Suspense fallback={<color attach="background" args={[SKY]} />}>
          <SkyPhoto />
          <SkyClouds />
        </Suspense>
      ) : (
        <color attach="background" args={[bg]} />
      )}
      <fog
        attach="fog"
        args={[
          bg,
          road ? 80 : garage ? 22 : showroom ? 16 : 12,
          road ? 220 : garage ? 64 : showroom ? 48 : 42,
        ]}
      />
      <hemisphereLight
        args={
          showroom
            ? ["#ffffff", "#cfcfcf", 1.15]
            : road
              ? ["#d4e8f8", "#6a5344", 0.75]
            : garage
              ? ["#f3f1ec", "#2a2826", 0.55]
              : ["#ffffff", "#111111", night ? 0.22 : 0.4]
        }
      />
      <spotLight
        position={[6, 10, 4]}
        angle={0.5}
        penumbra={0.85}
        intensity={showroom ? 90 : road ? 14 : garage ? 48 : night ? 28 : 70}
        color={road ? "#f4f7f2" : garage ? "#f4efe6" : "#ffffff"}
      />
      <spotLight
        position={[-7, 8, -3]}
        angle={0.55}
        penumbra={1}
        intensity={showroom ? 40 : road ? 8 : garage ? 22 : night ? 8 : 18}
        color={road ? "#f4f7f2" : garage ? "#f4efe6" : "#ffffff"}
      />
      {(showroom || garage) && (
        <spotLight
          position={[0, garage ? 9 : 12, garage ? 1.5 : 0]}
          angle={garage ? 0.85 : 0.7}
          penumbra={1}
          intensity={garage ? 36 : 55}
          color={garage ? "#f7f4ee" : "#ffffff"}
        />
      )}
      <Environment
        preset={ENV[studioId]}
        environmentIntensity={showroom ? 0.85 : road ? 0.85 : garage ? 0.42 : night ? 0.2 : 0.55}
      />
      {road ? (
        <ForestPine />
      ) : garage ? (
        <GarageFloor />
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <circleGeometry args={[22, 64]} />
          <meshStandardMaterial color={floor} roughness={showroom ? 0.78 : 0.95} />
        </mesh>
      )}
      {showroom && (
        <mesh position={[0, 6, -14]}>
          <planeGeometry args={[48, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      )}
      <FootprintShadow
        y={road ? 0.025 : 0.008}
        opacity={showroom ? 0.26 : road ? 0.58 : garage ? 0.42 : night ? 0.5 : 0.36}
      />
    </>
  );
}
