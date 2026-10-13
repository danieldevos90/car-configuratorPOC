"use client";

import { useState } from "react";
import {
  Aperture,
  Armchair,
  Car,
  CarFront,
  CircleDot,
  Cuboid,
  Images,
  Lightbulb,
  LightbulbOff,
  PanelRight,
  Route,
  Scan,
  X,
  type LucideIcon,
} from "lucide-react";
import { cameraPresets, studioPresets, type CameraId } from "@/config/finishes";
import { useConfigurator } from "@/store/configurator-store";

function isDesktop() {
  return window.matchMedia("(min-width: 901px)").matches;
}

const viewIcons: Record<CameraId, LucideIcon> = {
  hero: Aperture,
  front: CarFront,
  rear: CarFront,
  side: Car,
  "three-quarter": Cuboid,
  wheels: CircleDot,
  cabin: Armchair,
  top: Scan,
  road: Route,
};

export function CameraBar() {
  const cameraId = useConfigurator((s) => s.cameraId);
  const setCamera = useConfigurator((s) => s.setCamera);
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const setPanelOpen = useConfigurator((s) => s.setPanelOpen);
  const studioId = useConfigurator((s) => s.studioId);
  const setStudio = useConfigurator((s) => s.setStudio);
  const lightsOn = useConfigurator((s) => s.lightsOn);
  const setLightsOn = useConfigurator((s) => s.setLightsOn);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(false);

  const dockMenuOpen = viewsOpen || scenesOpen;

  function closeMobilePanel() {
    if (!isDesktop()) setPanelOpen(false);
  }

  function closeDockMenu() {
    setViewsOpen(false);
    setScenesOpen(false);
  }

  return (
    <nav
      className={`camera-bar ${viewsOpen ? "is-views-open" : ""} ${scenesOpen ? "is-scenes-open" : ""} ${dockMenuOpen ? "is-dock-menu-open" : ""}`}
      aria-label="Views and scenes"
    >
      {dockMenuOpen && (
        <button
          type="button"
          className="dock-close"
          aria-label="Close menu"
          onClick={closeDockMenu}
        >
          <X size={18} aria-hidden />
        </button>
      )}
      <div
        className="camera-bar-views"
        aria-hidden={!viewsOpen}
        inert={!viewsOpen ? true : undefined}
      >
        {cameraPresets.map((preset) => {
          const Icon = viewIcons[preset.id];
          return (
            <button
              key={preset.id}
              type="button"
              className={[
                cameraId === preset.id ? "is-active" : "",
                preset.id === "rear" ? "is-rear" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={preset.label}
              aria-pressed={cameraId === preset.id}
              title={preset.label}
              onClick={() => setCamera(preset.id)}
            >
              <Icon size={18} aria-hidden />
            </button>
          );
        })}
      </div>
      <div
        className="scene-picks"
        role="group"
        aria-label="Scenes"
        aria-hidden={!scenesOpen}
        inert={!scenesOpen ? true : undefined}
      >
        {studioPresets.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={studioId === scene.id ? "is-active" : ""}
            aria-pressed={studioId === scene.id}
            onClick={() => setStudio(scene.id)}
          >
            {scene.label}
          </button>
        ))}
        <button
          type="button"
          className="scene-lamp"
          aria-pressed={lightsOn}
          aria-label={lightsOn ? "Lamps on" : "Lamps off"}
          onClick={() => setLightsOn(!lightsOn)}
        >
          {lightsOn ? <Lightbulb size={18} aria-hidden /> : <LightbulbOff size={18} aria-hidden />}
        </button>
      </div>
      <div className="dock-actions">
        <button
          type="button"
          className={`dock-views ${viewsOpen ? "is-active" : ""}`}
          aria-pressed={viewsOpen}
          aria-expanded={viewsOpen}
          aria-label={viewsOpen ? "Hide camera views" : "Show camera views"}
          onClick={() => {
            setViewsOpen((open) => !open);
            setScenesOpen(false);
            closeMobilePanel();
          }}
        >
          <Aperture size={18} aria-hidden />
        </button>
        <button
          type="button"
          className={`dock-scenes ${scenesOpen ? "is-active" : ""}`}
          aria-pressed={scenesOpen}
          aria-expanded={scenesOpen}
          aria-label={scenesOpen ? "Hide scenes" : "Show scenes"}
          onClick={() => {
            setScenesOpen((open) => !open);
            setViewsOpen(false);
            closeMobilePanel();
          }}
        >
          <Images size={18} aria-hidden />
        </button>
        <button
          type="button"
          className={`dock-panel ${panelOpen ? "is-active" : ""}`}
          aria-pressed={panelOpen}
          aria-expanded={panelOpen}
          aria-controls="config-rail"
          aria-label={panelOpen ? "Hide configurator" : "Show configurator"}
          onClick={() => {
            setPanelOpen(!panelOpen);
            setViewsOpen(false);
            setScenesOpen(false);
          }}
        >
          <PanelRight size={18} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
