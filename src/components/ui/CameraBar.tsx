"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cameraPresets, type CameraId } from "@/config/finishes";
import { angleThumbSrc } from "@/config/nature-scenes";
import { DESKTOP_MEDIA } from "@/lib/scene-quality";
import { useConfigurator } from "@/store/configurator-store";

function useDesktopNav() {
  const [desktop, setDesktop] = useState(false);
  useLayoutEffect(() => {
    const query = window.matchMedia(DESKTOP_MEDIA);
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return desktop;
}

function AngleThumbs() {
  const cameraId = useConfigurator((s) => s.cameraId);
  const setCamera = useConfigurator((s) => s.setCamera);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [cameraId]);

  return (
    <div className="scene-thumbs" role="group" aria-label="Angles">
      {cameraPresets.map((preset) => (
        <button
          key={preset.id}
          ref={cameraId === preset.id ? activeRef : undefined}
          type="button"
          className={cameraId === preset.id ? "is-active" : ""}
          aria-pressed={cameraId === preset.id}
          onClick={() => setCamera(preset.id)}
        >
          <img src={angleThumbSrc(preset.id)} alt="" />
          <span>{preset.label}</span>
        </button>
      ))}
    </div>
  );
}

function AngleDotsNav() {
  const cameraId = useConfigurator((s) => s.cameraId);
  const setCamera = useConfigurator((s) => s.setCamera);
  const index = Math.max(
    0,
    cameraPresets.findIndex((preset) => preset.id === cameraId),
  );

  return (
    <nav className="angle-nav" aria-label="Camera angles">
      <div className="angle-nav-dots" role="tablist" aria-label="Angle">
        {cameraPresets.map((preset, dotIndex) => (
          <button
            key={preset.id}
            type="button"
            role="tab"
            className={dotIndex === index ? "is-active" : ""}
            aria-selected={dotIndex === index}
            aria-label={preset.label}
            onClick={() => setCamera(preset.id as CameraId)}
          />
        ))}
      </div>
    </nav>
  );
}

export function SceneThumbs() {
  const desktop = useDesktopNav();
  return desktop ? <AngleThumbs /> : <AngleDotsNav />;
}

export function CameraBar() {
  const stageMode = useConfigurator((s) => s.stageMode);
  const setStageMode = useConfigurator((s) => s.setStageMode);

  return (
    <nav className="camera-bar" aria-label="View mode">
      <div className="stage-mode" role="group" aria-label="3D or image">
        <button
          type="button"
          className={stageMode === "3d" ? "is-active" : ""}
          aria-pressed={stageMode === "3d"}
          onClick={() => setStageMode("3d")}
        >
          3D
        </button>
        <button
          type="button"
          className={stageMode === "image" ? "is-active" : ""}
          aria-pressed={stageMode === "image"}
          onClick={() => setStageMode("image")}
        >
          Image
        </button>
      </div>
    </nav>
  );
}
