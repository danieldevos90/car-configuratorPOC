"use client";

import { useMemo } from "react";
import { CanvasTexture } from "three";
import type { Vector3 } from "three";

let sharedWheelShadowMap: CanvasTexture | null = null;

function getWheelShadowMap() {
  if (sharedWheelShadowMap) return sharedWheelShadowMap;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0.95)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  sharedWheelShadowMap = new CanvasTexture(canvas);
  sharedWheelShadowMap.needsUpdate = true;
  return sharedWheelShadowMap;
}

type WheelContactShadowsProps = {
  contacts: Vector3[];
  y: number;
  opacity: number;
  scale?: number;
};

export function WheelContactShadows({
  contacts,
  y,
  opacity,
  scale = 0.44,
}: WheelContactShadowsProps) {
  const map = useMemo(() => getWheelShadowMap(), []);
  if (!map || contacts.length === 0) return null;

  return (
    <group>
      {contacts.map((contact, index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[contact.x, y, contact.z]}
          renderOrder={13}
        >
          <planeGeometry args={[scale, scale]} />
          <meshBasicMaterial
            map={map}
            transparent
            depthWrite={false}
            toneMapped={false}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}
