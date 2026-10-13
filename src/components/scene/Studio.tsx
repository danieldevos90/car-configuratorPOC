"use client";

import { Suspense, useMemo } from "react";
import { Cloud, Clouds, Environment } from "@react-three/drei";
import { BackSide, CanvasTexture, MeshLambertMaterial } from "three";
import type { StudioId } from "@/config/finishes";
import { useConfigurator } from "@/store/configurator-store";
import { ForestPine } from "./ForestPine";
import { FOREST_SKY_URL } from "./outdoor-stage";

const DAYLIGHT = {
  sky: "#e6eaef",
  floor: "#d5dae1",
  cove: "#f3f5f7",
} as const;

const SKY_HAZE = "#9ec8ea";
const SKY_URL = FOREST_SKY_URL;

class SkyCloudMaterial extends MeshLambertMaterial {
  constructor() {
    super({ fog: false, depthWrite: false, transparent: true });
  }
}

/** Single HDR for sky + car IBL (no second forest preset). */
function OutdoorSky({ lite }: { lite: boolean }) {
  return (
    <Environment
      files={SKY_URL}
      background
      backgroundIntensity={0.95}
      environmentIntensity={lite ? 0.78 : 0.9}
    />
  );
}

/** Light accents — car stays the hero. */
function SkyClouds({ lite }: { lite: boolean }) {
  if (lite) return null;
  return (
    <Clouds texture="/sky/cloud.png" material={SkyCloudMaterial} limit={24}>
      <Cloud
        seed={1}
        position={[-10, 11, -14]}
        bounds={[12, 2, 5]}
        volume={4}
        opacity={0.88}
        speed={0.02}
        segments={8}
        color="#ffffff"
      />
      <Cloud
        seed={4}
        position={[12, 10.5, -22]}
        bounds={[10, 1.8, 4]}
        volume={3.2}
        opacity={0.8}
        speed={0.015}
        segments={8}
        color="#f7fbff"
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
    const drawBlob = (insetX: number, insetY: number, radius: number, blur: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#000000";
      ctx.filter = `blur(${blur}px)`;
      ctx.beginPath();
      ctx.roundRect(insetX, insetY, width - insetX * 2, height - insetY * 2, radius);
      ctx.fill();
      ctx.restore();
    };
    drawBlob(46, 64, 46, 22, 1);
    drawBlob(72, 96, 36, 10, 0.92);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  if (!map) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={12}>
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

/** Soft north-light cove: daylight fill, studio HDR on the paint. */
function DaylightStudio() {
  return (
    <>
      <color attach="background" args={[DAYLIGHT.sky]} />
      <fog attach="fog" args={[DAYLIGHT.sky, 18, 56]} />
      <hemisphereLight args={["#f7fbff", "#c5ccd4", 1.05]} />
      <spotLight
        position={[5.5, 9.5, 5]}
        angle={0.55}
        penumbra={1}
        intensity={48}
        color="#fff8f2"
      />
      <spotLight
        position={[-6, 7.5, -2]}
        angle={0.7}
        penumbra={1}
        intensity={22}
        color="#e7f0ff"
      />
      <spotLight
        position={[0, 11, 1.2]}
        angle={0.75}
        penumbra={1}
        intensity={36}
        color="#ffffff"
      />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.78} />
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color={DAYLIGHT.floor} roughness={0.72} metalness={0.02} />
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[16, 16, 14, 48, 1, true, Math.PI, Math.PI]} />
        <meshStandardMaterial color={DAYLIGHT.cove} roughness={0.94} side={BackSide} />
      </mesh>
      <FootprintShadow y={0.018} opacity={0.36} />
    </>
  );
}

export function Studio({ studioId }: { studioId: StudioId }) {
  const sceneNavigating = useConfigurator((s) => s.sceneNavigating);
  const highDetail = useConfigurator((s) => s.highDetail);
  const outdoor = studioId === "road";
  const liteSky = sceneNavigating || !highDetail;

  if (!outdoor) return <DaylightStudio />;

  return (
    <>
      <Suspense fallback={<color attach="background" args={[SKY_HAZE]} />}>
        <OutdoorSky lite={liteSky} />
        <SkyClouds lite={liteSky} />
      </Suspense>
      <fog attach="fog" args={[SKY_HAZE, 38, 105]} />
      <hemisphereLight args={["#d4e8f8", "#6a5344", 0.75]} />
      <spotLight
        position={[6, 10, 4]}
        angle={0.5}
        penumbra={0.85}
        intensity={14}
        color="#f4f7f2"
      />
      <spotLight
        position={[-7, 8, -3]}
        angle={0.55}
        penumbra={1}
        intensity={8}
        color="#f4f7f2"
      />
      <Suspense fallback={null}>
        <ForestPine />
      </Suspense>
      <FootprintShadow y={0.055} opacity={0.88} />
    </>
  );
}
