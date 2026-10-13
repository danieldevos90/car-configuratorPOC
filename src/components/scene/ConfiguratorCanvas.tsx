"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { vehicles } from "@/config/catalog";
import { useSceneDpr } from "@/hooks/useSceneDpr";
import { useConfigurator } from "@/store/configurator-store";
import { CameraRig } from "./CameraRig";
import { SceneBusyReporter } from "./SceneBusyReporter";
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

type ConfiguratorCanvasProps = {
  onReady?: () => void;
};

export function ConfiguratorCanvas({ onReady }: ConfiguratorCanvasProps) {
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const studioId = useConfigurator((s) => s.studioId);
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const vehicle = vehicles[vehicleId];
  const [resolved, setResolved] = useState<{ url: string; optimized: boolean } | null>(
    null,
  );
  const [vehicleReady, setVehicleReady] = useState(false);
  const dpr = useSceneDpr();

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    setVehicleReady(false);
    void resolveModelUrl(vehicle.webUrl, vehicle.sourceUrl).then((result) => {
      if (!cancelled) setResolved(result);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicle.webUrl, vehicle.sourceUrl]);

  useEffect(() => {
    if (vehicleReady) onReady?.();
  }, [vehicleReady, onReady]);

  return (
    <Canvas
      className="scene-canvas"
      dpr={dpr}
      gl={{
        antialias: !isCompactDevice,
        powerPreference: isCompactDevice ? "low-power" : "high-performance",
        alpha: false,
        stencil: false,
      }}
      camera={{ fov: 32, near: 0.1, far: 220, position: [7.8, 2.05, 9.2] }}
    >
      <SceneBusyReporter pending={!resolved || !vehicleReady} />
      <Studio studioId={studioId} />
      <CameraRig baseDpr={dpr} />
      {resolved ? (
        <Suspense fallback={null}>
          <Vehicle
            key={resolved.url}
            vehicle={vehicle}
            url={resolved.url}
            onReady={() => setVehicleReady(true)}
          />
        </Suspense>
      ) : null}
    </Canvas>
  );
}
