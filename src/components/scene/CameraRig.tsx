"use client";

import { useCallback, useEffect, useRef } from "react";
import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { cameraPresets } from "@/config/finishes";
import { useConfigurator } from "@/store/configurator-store";

const FIT_VIEWS = new Set(["road", "hero"]);
const INTERIOR_VIEWS = new Set(["cabin"]);
const EXTERIOR_FOV = 32;
const INTERIOR_FOV = 62;
const VERTICAL_FOV = (EXTERIOR_FOV * Math.PI) / 180;

const NAVIGATION_IDLE_MS = 320;
/** Must match the layouts where globals.css docks the configurator to the right. */
const SIDE_PANEL_MEDIA = "(min-width: 901px), (orientation: landscape) and (max-height: 520px)";

const direction = new Vector3();
const look = new Vector3();
const placed = new Vector3();

type CameraRigProps = {
  baseDpr: [number, number];
};

export function CameraRig({ baseDpr }: CameraRigProps) {
  const controls = useRef<CameraControls>(null);
  const cameraId = useConfigurator((s) => s.cameraId);
  const vehicleRadius = useConfigurator((s) => s.vehicleRadius);
  const setSceneNavigating = useConfigurator((s) => s.setSceneNavigating);
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const setDpr = useThree((s) => s.setDpr);
  const size = useThree((s) => s.size);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const baseDprRef = useRef(baseDpr);
  baseDprRef.current = baseDpr;
  const navigationIdleRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastPresetKeyRef = useRef("");

  const portrait =
    size.width > 0 && size.width <= 900 && size.width < size.height;
  const interior = INTERIOR_VIEWS.has(cameraId);

  useEffect(() => {
    setDpr(baseDpr);
  }, [baseDpr, setDpr]);

  const endNavigation = useCallback(() => {
    clearTimeout(navigationIdleRef.current);
    navigationIdleRef.current = setTimeout(() => {
      setSceneNavigating(false);
      if (!isCompactDevice) setDpr(baseDprRef.current);
    }, NAVIGATION_IDLE_MS);
  }, [isCompactDevice, setDpr, setSceneNavigating]);

  const beginNavigation = useCallback(() => {
    clearTimeout(navigationIdleRef.current);
    setSceneNavigating(true);
    if (isCompactDevice) return;
    const [, max] = baseDprRef.current;
    const scaled = Math.max(1, Math.min(1.85, max * 0.88));
    setDpr([1, scaled]);
  }, [isCompactDevice, setDpr, setSceneNavigating]);

  useEffect(() => {
    const preset = cameraPresets.find((item) => item.id === cameraId);
    const rig = controls.current;
    if (!preset || !rig) return;

    const presetKey = `${cameraId}:${portrait}:${vehicleRadius.toFixed(2)}`;
    if (presetKey === lastPresetKeyRef.current) return;
    lastPresetKeyRef.current = presetKey;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const inside = INTERIOR_VIEWS.has(preset.id);

    rig.minDistance = inside ? 0.18 : preset.id === "wheels" ? 0.55 : 2.2;
    rig.maxDistance = inside ? 2.8 : 10.6;
    if (camera instanceof PerspectiveCamera) {
      camera.fov = inside ? INTERIOR_FOV : EXTERIOR_FOV;
      camera.near = inside ? 0.05 : 0.1;
      camera.updateProjectionMatrix();
    }
    if (preset.id === "wheels") return;

    const [x, y, z] = preset.position;
    const [tx, ty, tz] = preset.target;
    placed.set(x, y, z);
    look.set(tx, ty, tz);

    if (portrait && FIT_VIEWS.has(preset.id)) {
      const { width, height } = sizeRef.current;
      const aspect = width / Math.max(height, 1);
      const halfV = VERTICAL_FOV / 2;
      const halfH = Math.atan(Math.tan(halfV) * aspect);
      const top = Math.min(0.22, 148 / Math.max(height, 1));
      const bottom = Math.min(0.2, 88 / Math.max(height, 1));
      const visible = Math.max(0.45, 1 - top - bottom);
      const half = Math.min(halfH, halfV * visible);
      const distance = Math.min(36, (vehicleRadius * 1.18) / Math.tan(half));
      const aim = preset.id === "road" ? look.set(0, 0.7, 0) : look;
      if (preset.id === "road") {
        direction.set(0.1, 0.05, 1);
      } else {
        direction.set(x, y, z).sub(aim);
      }
      if (direction.lengthSq() < 1e-4) direction.set(1, 0.35, 1);
      direction.setLength(Math.max(distance, direction.length()));
      const shift = ((bottom - top) / 2) * 2 * direction.length() * Math.tan(halfV);
      if (preset.id !== "road") aim.y -= shift;
      placed.copy(aim).add(direction);
      if (preset.id === "road") look.y = 0.4;
    }

    void rig.setLookAt(
      placed.x,
      placed.y,
      placed.z,
      look.x,
      look.y,
      look.z,
      !reduced && !inside,
    );
  }, [camera, cameraId, portrait, vehicleRadius]);

  useEffect(
    () => () => {
      clearTimeout(navigationIdleRef.current);
      setSceneNavigating(false);
    },
    [setSceneNavigating],
  );

  /** Pixels to shift the projection so the car centres in the area the panel leaves free. */
  const panelShift = useRef({ x: 0, y: 0 });
  const appliedShift = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const rail = document.getElementById("config-rail");
    if (!panelOpen || !rail) {
      panelShift.current = { x: 0, y: 0 };
      return;
    }
    if (window.matchMedia(SIDE_PANEL_MEDIA).matches) {
      panelShift.current = { x: Math.max(0, size.width - rail.offsetLeft) / 2, y: 0 };
    } else {
      const covered = Math.max(0, size.height - rail.offsetTop);
      panelShift.current = { x: 0, y: Math.min(covered / 2, size.height * 0.24) };
    }
  }, [panelOpen, size.width, size.height]);

  useEffect(() => {
    invalidate();
  }, [panelOpen, size.width, size.height, invalidate]);

  useFrame((_, delta) => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const target = interior ? { x: 0, y: 0 } : panelShift.current;
    const applied = appliedShift.current;
    const snap = isCompactDevice;
    const ease = snap ? 1 : 1 - Math.exp(-delta * 7);
    const x = Math.abs(target.x - applied.x) < 0.5 ? target.x : applied.x + (target.x - applied.x) * ease;
    const y = Math.abs(target.y - applied.y) < 0.5 ? target.y : applied.y + (target.y - applied.y) * ease;
    if (x === applied.x && y === applied.y && applied.w === size.width && applied.h === size.height) {
      return;
    }
    appliedShift.current = { x, y, w: size.width, h: size.height };
    if (x === 0 && y === 0) camera.clearViewOffset();
    else camera.setViewOffset(size.width, size.height, x, y, size.width, size.height);
    if (!snap && (x !== target.x || y !== target.y)) invalidate();
  });

  return (
    <>
      {interior ? (
        <pointLight
          position={[0.05, 1.32, 0.15]}
          intensity={5}
          distance={4}
          color="#fff3e4"
        />
      ) : null}
      <CameraControls
        ref={controls}
        makeDefault
        regress={isCompactDevice}
        minDistance={interior ? 0.18 : 2.2}
        maxDistance={interior ? 2.8 : 10.6}
        minPolarAngle={interior ? 0.35 : 0}
        maxPolarAngle={interior ? Math.PI / 1.55 : Math.PI / 1.92}
        smoothTime={interior ? 0.22 : 0.1}
        draggingSmoothTime={interior ? 0.12 : 0.06}
        dollySpeed={interior ? 0.85 : 1.15}
        dollyToCursor
        onControlStart={beginNavigation}
        onControlEnd={endNavigation}
      />
    </>
  );
}
