"use client";

import { create } from "zustand";
import { vehicles, type VehicleId } from "@/config/catalog";
import type { CameraId, StudioId } from "@/config/finishes";
import {
  applyBuildVisibility,
  defaultHiddenPartIds,
  togglePartVisibility,
} from "@/lib/part-visibility";
import {
  isCompactViewport,
  shouldLoadHighDetail,
  textureCap,
} from "@/lib/scene-quality";

export type ConfigSection = "paint" | "interior" | "kit" | "summary";
export type StageMode = "3d" | "image";

/** Camera fly-to request; `partId: null` frames the whole vehicle. */
export type FocusRequest = { partId: string | null; nonce: number };

const FINISH_DEFAULTS = {
  paintId: "gmanufaktur",
  contrastPaintId: "arctic",
  interiorId: "saddle",
  caliperId: "gunmetal",
};

function nextFocus(prev: FocusRequest | null, partId: string | null): FocusRequest {
  return { partId, nonce: (prev?.nonce ?? 0) + 1 };
}

const CABIN_CAMERA: CameraId = "cabin";

function isInteriorCamera(id: CameraId) {
  return id === CABIN_CAMERA;
}

function defaultExteriorCamera(studioId: StudioId): CameraId {
  return studioId === "road" ? "road" : "hero";
}

function cameraForConfigSection(
  section: ConfigSection,
  studioId: StudioId,
): CameraId {
  switch (section) {
    case "interior":
      return CABIN_CAMERA;
    case "kit":
      return "three-quarter";
    case "summary":
      return "side";
    case "paint":
      return defaultExteriorCamera(studioId);
  }
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

const DEFAULT_VEHICLE: VehicleId = "gw";

function vehicleDefaults() {
  return {
    vehicleId: DEFAULT_VEHICLE,
    hiddenPartIds: defaultHiddenPartIds(vehicles[DEFAULT_VEHICLE]),
  };
}

type ConfiguratorState = {
  vehicleId: VehicleId;
  paintId: string;
  contrastPaintId: string;
  interiorId: string;
  caliperId: string;
  studioId: StudioId;
  stageMode: StageMode;
  cameraId: CameraId;
  exteriorCameraId: CameraId;
  configSection: ConfigSection;
  lightsOn: boolean;
  hiddenPartIds: string[];
  selectedPartId: string | null;
  focusRequest: FocusRequest | null;
  panelOpen: boolean;
  auditOpen: boolean;
  vehicleRadius: number;
  sceneLoading: boolean;
  /** True while the user drags / zooms the 3D camera (lighter scene + lower DPR). */
  sceneNavigating: boolean;
  /** Phone / tablet viewport — keep the GPU budget low. */
  isCompactDevice: boolean;
  /** Desktop 3D: 4K maps, full anisotropy, full IBL. */
  highDetail: boolean;
  textureMaxSize: number;
  setPaint: (id: string) => void;
  setContrastPaint: (id: string) => void;
  applyBuild: (buildId: string) => void;
  setInterior: (id: string) => void;
  setCaliper: (id: string) => void;
  setConfigSection: (section: ConfigSection) => void;
  /** Scroll-spy: mark the section in view and match the stage to that section. */
  setActiveSection: (section: ConfigSection) => void;
  setStudio: (id: StudioId) => void;
  setStageMode: (mode: StageMode) => void;
  setCamera: (id: CameraId) => void;
  leaveInteriorCamera: () => void;
  setLightsOn: (on: boolean) => void;
  togglePart: (partId: string) => void;
  setSelectedPart: (partId: string | null) => void;
  /** Select a part from the 3D view: open its options and fly the camera to it. */
  pickPart: (partId: string) => void;
  focusPart: (partId: string | null) => void;
  resetConfiguration: () => void;
  setPanelOpen: (open: boolean) => void;
  setAuditOpen: (open: boolean) => void;
  setVehicleRadius: (radius: number) => void;
  setSceneLoading: (loading: boolean) => void;
  setSceneNavigating: (navigating: boolean) => void;
  bootstrapScene: () => void;
  /** Re-read the viewport. Compact layouts drop out of 3D; desktop stays at max quality. */
  syncViewport: () => void;
};

export const useConfigurator = create<ConfiguratorState>((set, get) => ({
  ...vehicleDefaults(),
  ...FINISH_DEFAULTS,
  focusRequest: null,
  studioId: "daylight",
  stageMode: "image",
  cameraId: "hero",
  exteriorCameraId: "hero",
  configSection: "paint",
  lightsOn: true,
  selectedPartId: null,
  panelOpen: false,
  auditOpen: false,
  vehicleRadius: 2.8,
  sceneLoading: false,
  sceneNavigating: false,
  isCompactDevice: true,
  highDetail: false,
  textureMaxSize: 512,
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
  setContrastPaint: (id) => {
    const state = get();
    if (state.contrastPaintId === id) return;
    set({
      contrastPaintId: id,
      ...(isInteriorCamera(state.cameraId)
        ? { cameraId: resolveExteriorCamera(state) }
        : {}),
      ...(state.configSection !== "paint" ? { configSection: "paint" } : {}),
    });
  },
  applyBuild: (buildId) => {
    const state = get();
    set({
      hiddenPartIds: applyBuildVisibility(
        vehicles[state.vehicleId],
        state.hiddenPartIds,
        buildId,
      ),
      ...(isInteriorCamera(state.cameraId)
        ? { cameraId: resolveExteriorCamera(state) }
        : {}),
      configSection: "kit",
      selectedPartId: null,
      focusRequest: nextFocus(state.focusRequest, null),
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
    const cameraId = cameraForConfigSection(section, state.studioId);
    if (state.configSection === section && state.cameraId === cameraId) return;
    set({
      configSection: section,
      cameraId,
      exteriorCameraId: cameraId,
    });
  },
  setActiveSection: (section) => {
    const state = get();
    if (section === "interior") {
      if (state.configSection === "interior" && isInteriorCamera(state.cameraId)) {
        return;
      }
      set(enterInteriorView(state));
      return;
    }
    const cameraId = cameraForConfigSection(section, state.studioId);
    if (state.configSection === section && state.cameraId === cameraId) return;
    set({
      configSection: section,
      cameraId,
      exteriorCameraId: cameraId,
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
  setStageMode: (mode) => {
    if (mode === "3d" && (get().isCompactDevice || isCompactViewport())) return;
    if (mode === "3d") {
      set({
        stageMode: "3d",
        isCompactDevice: false,
        highDetail: true,
        textureMaxSize: textureCap(false, true),
      });
      return;
    }
    set({ stageMode: mode });
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
    const slot = vehicle.exclusiveGroups?.find(
      (group) => group.required && group.partIds.includes(partId),
    );
    const shown =
      slot?.partIds.find((id) => !hiddenPartIds.includes(id)) ?? partId;
    const shownPart = vehicle.parts.find((part) => part.id === shown);
    const focus = shownPart?.view
      ? {
          selectedPartId: shown,
          focusRequest: nextFocus(state.focusRequest, shown),
          ...(shownPart.view.camera === "wheels"
            ? { cameraId: "wheels" as const, exteriorCameraId: "wheels" as const }
            : {}),
        }
      : {};
    if (isInteriorCamera(state.cameraId)) {
      set({
        hiddenPartIds,
        cameraId: resolveExteriorCamera(state),
        configSection: "kit",
        ...focus,
      });
      return;
    }
    set({
      hiddenPartIds,
      ...(state.configSection !== "kit" ? { configSection: "kit" } : {}),
      ...focus,
    });
  },
  setSelectedPart: (partId) => set({ selectedPartId: partId }),
  pickPart: (partId) => {
    const state = get();
    set({
      selectedPartId: partId,
      focusRequest: nextFocus(state.focusRequest, partId),
      configSection: "kit",
      panelOpen: true,
      ...(isInteriorCamera(state.cameraId)
        ? { cameraId: resolveExteriorCamera(state) }
        : {}),
    });
  },
  focusPart: (partId) =>
    set((state) => {
      const part = vehicles[state.vehicleId].parts.find((item) => item.id === partId);
      const wheels = part?.view?.camera === "wheels";
      return {
        selectedPartId: partId,
        focusRequest: nextFocus(state.focusRequest, partId),
        ...(wheels ? { cameraId: "wheels" as const, exteriorCameraId: "wheels" as const } : {}),
      };
    }),
  resetConfiguration: () =>
    set((state) => ({
      ...FINISH_DEFAULTS,
      hiddenPartIds: defaultHiddenPartIds(vehicles[state.vehicleId]),
      selectedPartId: null,
      focusRequest: nextFocus(state.focusRequest, null),
      ...(isInteriorCamera(state.cameraId)
        ? { cameraId: resolveExteriorCamera(state) }
        : {}),
    })),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setAuditOpen: (open) => set({ auditOpen: open }),
  setVehicleRadius: (radius) => set({ vehicleRadius: radius }),
  setSceneLoading: (loading) => set({ sceneLoading: loading }),
  setSceneNavigating: (navigating) => set({ sceneNavigating: navigating }),
  bootstrapScene: () => {
    const isCompactDevice = isCompactViewport();
    const highDetail = shouldLoadHighDetail(isCompactDevice);
    const studioId: StudioId = "daylight";
    set({
      studioId,
      isCompactDevice,
      highDetail,
      textureMaxSize: textureCap(isCompactDevice, highDetail),
      panelOpen: true,
      stageMode: isCompactDevice ? "image" : get().stageMode,
      ...vehicleDefaults(),
      selectedPartId: null,
    });
  },
  syncViewport: () => {
    const isCompactDevice = isCompactViewport();
    const highDetail = shouldLoadHighDetail(isCompactDevice);
    set({
      isCompactDevice,
      highDetail,
      textureMaxSize: textureCap(isCompactDevice, highDetail),
      ...(isCompactDevice ? { stageMode: "image" as const } : {}),
    });
  },
}));

export function selectVehicle() {
  return vehicles[useConfigurator.getState().vehicleId];
}
