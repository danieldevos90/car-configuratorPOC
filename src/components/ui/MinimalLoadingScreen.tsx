"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
};

export function MinimalLoadingScreen({ className }: Props) {
  const { progress, active } = useProgress();
  const [creep, setCreep] = useState(4);

  useEffect(() => {
    if (active || progress > 0) return;
    const id = window.setInterval(() => {
      setCreep((value) => Math.min(12, value + 0.35));
    }, 90);
    return () => window.clearInterval(id);
  }, [active, progress]);

  const shown = Math.min(100, Math.max(progress, active ? progress : creep));
  const rounded = Math.round(shown);

  return (
    <div
      className={["loading-screen", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Loading. ${rounded} percent.`}
    >
      <div className="loading-stage">
        <p className="loading-word">Gelände Werke</p>
        <div
          className="loading-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
        >
          <span className="loading-track-fill" style={{ width: `${shown}%` }} />
        </div>
        <p className="loading-percent">{rounded}</p>
      </div>
    </div>
  );
}
