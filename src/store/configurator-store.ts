"use client";

import { create } from "zustand";
import { vehicles, type VehicleId } from "@/config/catalog";
import type { CameraId, StudioId } from "@/config/finishes";

type ConfiguratorState = {
  vehicleId: VehicleId;
  paintId: string;
  interiorId: string;
  caliperId: string;
  studioId: StudioId;
  cameraId: CameraId;
  lightsOn: boolean;
  hiddenPartIds: string[];
  selectedPartId: string | null;
  panelOpen: boolean;
  auditOpen: boolean;
  vehicleRadius: number;
  setVehicle: (id: VehicleId) => void;
  setPaint: (id: string) => void;
  setInterior: (id: string) => void;
  setCaliper: (id: string) => void;
  setStudio: (id: StudioId) => void;
  setCamera: (id: CameraId) => void;
  setLightsOn: (on: boolean) => void;
  togglePart: (partId: string) => void;
  setSelectedPart: (partId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setAuditOpen: (open: boolean) => void;
  setVehicleRadius: (radius: number) => void;
};

export const useConfigurator = create<ConfiguratorState>((set, get) => ({
  vehicleId: "retro",
  paintId: "gmanufaktur",
  interiorId: "saddle",
  caliperId: "gunmetal",
  studioId: "road",
  cameraId: "road",
  lightsOn: true,
  hiddenPartIds: [],
  selectedPartId: null,
  panelOpen: false,
  auditOpen: false,
  vehicleRadius: 2.8,
  setVehicle: (id) =>
    set({
      vehicleId: id,
      hiddenPartIds: [],
      selectedPartId: null,
      cameraId: get().studioId === "road" ? "road" : "hero",
    }),
  setPaint: (id) => set({ paintId: id }),
  setInterior: (id) => set({ interiorId: id, cameraId: "cabin" }),
  setCaliper: (id) => set({ caliperId: id }),
  setStudio: (id) =>
    set({
      studioId: id,
      cameraId: id === "road" ? "road" : get().cameraId === "road" ? "hero" : get().cameraId,
    }),
  setCamera: (id) => set({ cameraId: id }),
  setLightsOn: (on) => set({ lightsOn: on }),
  togglePart: (partId) => {
    const hidden = new Set(get().hiddenPartIds);
    if (hidden.has(partId)) hidden.delete(partId);
    else hidden.add(partId);
    set({ hiddenPartIds: [...hidden] });
  },
  setSelectedPart: (partId) => set({ selectedPartId: partId }),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setAuditOpen: (open) => set({ auditOpen: open }),
  setVehicleRadius: (radius) => set({ vehicleRadius: radius }),
}));

export function selectVehicle() {
  return vehicles[useConfigurator.getState().vehicleId];
}
