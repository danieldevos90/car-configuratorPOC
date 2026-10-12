"use client";

import { useEffect, useState } from "react";
import { Html, useProgress } from "@react-three/drei";

type ProgressData = ReturnType<typeof useProgress.getState>;

export function SceneLoader({ fileSizeMb }: { fileSizeMb: number }) {
  // useGLTF writes this store synchronously while Vehicle is rendering.
  // Subscribing in an effect and applying the snapshot afterward keeps
  // that update out of Vehicle's render.
  const [snapshot, setSnapshot] = useState<ProgressData>(() => useProgress.getState());

  useEffect(() => {
    let alive = true;
    const apply = () => {
      if (alive) setSnapshot(useProgress.getState());
    };

    apply();
    const unsubscribe = useProgress.subscribe(() => {
      queueMicrotask(apply);
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const { progress, active, loaded, total } = snapshot;
  const pct = Math.min(100, Math.round(progress));
  const loadedMb = loaded ? loaded / (1024 * 1024) : 0;
  const totalMb = total ? total / (1024 * 1024) : fileSizeMb;

  return (
    <Html center>
      <div className="loader-card">
        <p className="loader-kicker">Loading scene</p>
        <p className="loader-title">{pct}%</p>
        <div className="loader-track" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="loader-meta">
          {active
            ? `${loadedMb.toFixed(0)} / ${totalMb.toFixed(0)} MB`
            : `${fileSizeMb.toFixed(0)} MB source asset`}
        </p>
      </div>
    </Html>
  );
}
