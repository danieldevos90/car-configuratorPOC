"use client";

import { create } from "zustand";
import {
  buildPresets,
  type BuildPresetId,
  presetForVehicle,
} from "@/config/build-presets";
import { vehicles, type VehicleId } from "@/config/catalog";
import type { CameraId, StudioId } from "@/config/finishes";
import { defaultHiddenPartIds, togglePartVisibility } from "@/lib/part-visibility";
import {
  isCompactViewport,
  shouldLoadHighDetail,
  textureCap,
} from "@/lib/scene-quality";

export type ConfigSection = "paint" | "interior" | "kit";

const CABIN_CAMERA: CameraId = "cabin";

function isInteriorCamera(id: CameraId) {
  return id === CABIN_CAMERA;
}

function defaultExteriorCamera(studioId: StudioId): CameraId {
  return studioId === "road" ? "road" : "hero";
}

function resolveExteriorCamera(state: {
  exteriorCameraId: CameraId;
  studioId: StudioId;
}): CameraId {
  const remembered = state.exteriorCameraId;
  if (!isInteriorCamera(remembered)) return remembered;
  return defaultExteriorCamera(state.studioId);
}

function enterInteriorView(state: {
  cameraId: CameraId;
  exteriorCameraId: CameraId;
}) {
  return {
    exteriorCameraId: isInteriorCamera(state.cameraId)
      ? state.exteriorCameraId
      : state.cameraId,
    cameraId: CABIN_CAMERA,
    configSection: "interior" as const,
  };
}

type ConfiguratorState = {
  buildPresetId: BuildPresetId;
  vehicleId: VehicleId;
  paintId: string;
  interiorId: string;
  caliperId: string;
  studioId: StudioId;
  cameraId: CameraId;
  exteriorCameraId: CameraId;
  configSection: ConfigSection;
  lightsOn: boolean;
  hiddenPartIds: string[];
  selectedPartId: string | null;
  panelOpen: boolean;
  auditOpen: boolean;
  vehicleRadius: number;
  sceneLoading: boolean;
  /** True while the user drags / zooms the 3D camera (lighter scene + lower DPR). */
  sceneNavigating: boolean;
  /** Phone / tablet viewport — keep the GPU budget low. */
  isCompactDevice: boolean;
  /** Wi‑Fi (or desktop without Save-Data): grass, clouds, fuller texture sampling. */
  highDetail: boolean;
  textureMaxSize: number;
  setBuildPreset: (id: BuildPresetId) => void;
  /** @deprecated Use setBuildPreset — kept for internal vehicle GLB swaps. */
  setVehicle: (id: VehicleId) => void;
  setPaint: (id: string) => void;
  setInterior: (id: string) => void;
  setCaliper: (id: string) => void;
  setConfigSection: (section: ConfigSection) => void;
  setStudio: (id: StudioId) => void;
  setCamera: (id: CameraId) => void;
  leaveInteriorCamera: () => void;
  setLightsOn: (on: boolean) => void;
  togglePart: (partId: string) => void;
  setSelectedPart: (partId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setAuditOpen: (open: boolean) => void;
  setVehicleRadius: (radius: number) => void;
  setSceneLoading: (loading: boolean) => void;
  setSceneNavigating: (navigating: boolean) => void;
  bootstrapScene: () => void;
  syncNetworkQuality: () => void;
};

function applyBuildPreset(id: BuildPresetId) {
  const preset = buildPresets[id];
  const vehicle = vehicles[preset.vehicleId];
  return {
    buildPresetId: id,
    vehicleId: preset.vehicleId,
    hiddenPartIds: [
      ...new Set([...defaultHiddenPartIds(vehicle), ...preset.hiddenPartIds]),
    ],
    selectedPartId: null,
  };
}

export const useConfigurator = create<ConfiguratorState>((set, get) => ({
  buildPresetId: "retro",
  vehicleId: "retro",
  paintId: "gmanufaktur",
  interiorId: "saddle",
  caliperId: "gunmetal",
  studioId: "daylight",
  cameraId: "hero",
  exteriorCameraId: "hero",
  configSection: "paint",
  lightsOn: true,
  hiddenPartIds: [],
  selectedPartId: null,
  panelOpen: false,
  auditOpen: false,
  vehicleRadius: 2.8,
  sceneLoading: true,
  sceneNavigating: false,
  isCompactDevice: true,
  highDetail: false,
  textureMaxSize: 512,
  setBuildPreset: (id) => {
    const cameraId =
      get().studioId === "road" ? "road" : ("hero" as CameraId);
    set({
      ...applyBuildPreset(id),
      cameraId,
      exteriorCameraId: cameraId,
      configSection: "paint",
    });
  },
  setVehicle: (id) => {
    get().setBuildPreset(presetForVehicle(id));
  },
  setPaint: (id) => {
    const state = get();
    if (state.paintId === id) return;
    if (isInteriorCamera(state.cameraId)) {
      set({
        paintId: id,
        cameraId: resolveExteriorCamera(state),
        configSection: "paint",
      });
      return;
    }
    set({
      paintId: id,
      ...(state.configSection !== "paint" ? { configSection: "paint" } : {}),
    });
  },
  setInterior: (id) => {
    const state = get();
    if (state.interiorId === id) return;
    if (isInteriorCamera(state.cameraId)) {
      set({ interiorId: id });
      return;
    }
    set({ interiorId: id, ...enterInteriorView(state) });
  },
  setCaliper: (id) => {
    const state = get();
    if (state.caliperId === id) return;
    if (isInteriorCamera(state.cameraId)) {
      set({
        caliperId: id,
        cameraId: resolveExteriorCamera(state),
        configSection: "paint",
      });
      return;
    }
    set({
      caliperId: id,
      ...(state.configSection !== "paint" ? { configSection: "paint" } : {}),
    });
  },
  setConfigSection: (section) => {
    const state = get();
    if (section === "interior") {
      if (state.configSection === "interior" && isInteriorCamera(state.cameraId)) {
        return;
      }
      set(enterInteriorView(state));
      return;
    }
    if (
      section === state.configSection &&
      !isInteriorCamera(state.cameraId)
    ) {
      return;
    }
    set({
      configSection: section,
      ...(isInteriorCamera(state.cameraId)
        ? { cameraId: resolveExteriorCamera(state) }
        : {}),
    });
  },
  setStudio: (id) => {
    const state = get();
    const nextCamera =
      id === "road"
        ? "road"
        : state.cameraId === "road"
          ? "hero"
          : state.cameraId;
    set({
      studioId: id,
      cameraId: nextCamera,
      exteriorCameraId: isInteriorCamera(nextCamera)
        ? state.exteriorCameraId
        : nextCamera,
    });
  },
  setCamera: (id) => {
    const state = get();
    if (id === state.cameraId) {
      if (isInteriorCamera(id) && state.configSection !== "interior") {
        set({ configSection: "interior" });
      } else if (!isInteriorCamera(id) && state.configSection === "interior") {
        set({ configSection: "paint" });
      }
      return;
    }
    if (isInteriorCamera(id)) {
      set(enterInteriorView(state));
      return;
    }
    set({
      cameraId: id,
      exteriorCameraId: id,
      ...(state.configSection === "interior" ? { configSection: "paint" } : {}),
    });
  },
  leaveInteriorCamera: () => {
    const state = get();
    if (!isInteriorCamera(state.cameraId)) return;
    set({ cameraId: resolveExteriorCamera(state) });
  },
  setLightsOn: (on) => set({ lightsOn: on }),
  togglePart: (partId) => {
    const state = get();
    const vehicle = vehicles[state.vehicleId];
    const hiddenPartIds = togglePartVisibility(
      vehicle,
      state.hiddenPartIds,
      partId,
    );
    if (isInteriorCamera(state.cameraId)) {
      set({
        hiddenPartIds,
        cameraId: resolveExteriorCamera(state),
        configSection: "kit",
      });
      return;
    }
    set({
      hiddenPartIds,
      ...(state.configSection !== "kit" ? { configSection: "kit" } : {}),
    });
  },
  setSelectedPart: (partId) => set({ selectedPartId: partId }),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setAuditOpen: (open) => set({ auditOpen: open }),
  setVehicleRadius: (radius) => set({ vehicleRadius: radius }),
  setSceneLoading: (loading) => set({ sceneLoading: loading }),
  setSceneNavigating: (navigating) => set({ sceneNavigating: navigating }),
  bootstrapScene: () => {
    const isCompactDevice = isCompactViewport();
    const highDetail = shouldLoadHighDetail(isCompactDevice);
    const studioId: StudioId = "daylight";
    const cameraId = defaultExteriorCamera(studioId);
    set({
      studioId,
      cameraId,
      exteriorCameraId: cameraId,
      isCompactDevice,
      highDetail,
      textureMaxSize: textureCap(isCompactDevice, highDetail),
      panelOpen: !isCompactDevice,
      ...applyBuildPreset(get().buildPresetId),
    });
  },
  syncNetworkQuality: () => {
    const isCompactDevice = get().isCompactDevice;
    const highDetail = shouldLoadHighDetail(isCompactDevice);
    set({
      highDetail,
      textureMaxSize: textureCap(isCompactDevice, highDetail),
    });
  },
}));

export function selectVehicle() {
  return vehicles[useConfigurator.getState().vehicleId];
}
