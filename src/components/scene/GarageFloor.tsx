"use client";

import { useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

const FLOOR = 48;
const REPEAT = 6;

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

function createGarageFloorTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const tiles = 2;
  const tile = size / tiles;
  const joint = 14;

  ctx.fillStyle = "#4a4744";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < tiles; y += 1) {
    for (let x = 0; x < tiles; x += 1) {
      const shade = 168 + ((x * 13 + y * 19) % 14);
      ctx.fillStyle = `rgb(${shade + 4}, ${shade + 2}, ${shade - 2})`;
      ctx.fillRect(
        x * tile + joint,
        y * tile + joint,
        tile - joint * 2,
        tile - joint * 2,
      );
    }
  }

  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 16) {
    const n = (Math.random() - 0.5) * 14;
    data[i] = clamp(data[i] + n);
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n * 0.8);
  }
  ctx.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(REPEAT, REPEAT);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function GarageFloor() {
  const map = useMemo(() => createGarageFloorTexture(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
        <planeGeometry args={[FLOOR, FLOOR]} />
        <meshStandardMaterial
          map={map ?? undefined}
          color="#ffffff"
          roughness={0.62}
          metalness={0.06}
        />
      </mesh>
      <mesh position={[0, 2.6, -9]} receiveShadow>
        <planeGeometry args={[24, 5.6]} />
        <meshStandardMaterial color="#3c3a38" roughness={0.92} />
      </mesh>
      <mesh position={[-10, 2.6, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 5.6]} />
        <meshStandardMaterial color="#343230" roughness={0.92} />
      </mesh>
      <mesh position={[10, 2.6, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 5.6]} />
        <meshStandardMaterial color="#343230" roughness={0.92} />
      </mesh>
    </group>
  );
}
