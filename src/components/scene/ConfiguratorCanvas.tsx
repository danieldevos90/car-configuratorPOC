"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { vehicles } from "@/config/catalog";
import { useConfigurator } from "@/store/configurator-store";
import { CameraRig } from "./CameraRig";
import { SceneLoader } from "./Loader";
import { Studio } from "./Studio";
import { Vehicle } from "./Vehicle";

async function resolveModelUrl(webUrl: string, sourceUrl: string) {
  try {
    const response = await fetch(webUrl, { method: "HEAD" });
    if (response.ok) return { url: webUrl, optimized: true };
  } catch {
    /* fall through to source */
  }
  return { url: sourceUrl, optimized: false };
}

export function ConfiguratorCanvas() {
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const studioId = useConfigurator((s) => s.studioId);
  const vehicle = vehicles[vehicleId];
  const [resolved, setResolved] = useState<{ url: string; optimized: boolean } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    void resolveModelUrl(vehicle.webUrl, vehicle.sourceUrl).then((result) => {
      if (!cancelled) setResolved(result);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicle.webUrl, vehicle.sourceUrl]);

  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      }}
      camera={{ fov: 32, near: 0.1, far: 220, position: [7.8, 2.05, 9.2] }}
    >
      <AdaptiveDpr pixelated />
      <Studio studioId={studioId} />
      <CameraRig />
      {resolved ? (
        <Suspense fallback={<SceneLoader fileSizeMb={vehicle.audit.sizeMb} />}>
          <Vehicle key={resolved.url} vehicle={vehicle} url={resolved.url} />
        </Suspense>
      ) : (
        <SceneLoader fileSizeMb={vehicle.audit.sizeMb} />
      )}
    </Canvas>
  );
}
