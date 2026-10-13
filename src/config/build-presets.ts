import type { VehicleId } from "@/config/catalog";

export type BuildPresetId = "retro" | "oem";

export type BuildPreset = {
  id: BuildPresetId;
  label: string;
  vehicleId: VehicleId;
  /** Parts hidden when applying this preset (kit off, alternate wheels, etc.). */
  hiddenPartIds: string[];
  description: string;
};

/** Top-level build: which GLB loads and which option groups start visible. */
export const buildPresets: Record<BuildPresetId, BuildPreset> = {
  retro: {
    id: "retro",
    label: "Retro",
    vehicleId: "retro",
    hiddenPartIds: [],
    description: "Gelände Werke restomod with full kit",
  },
  oem: {
    id: "oem",
    label: "OEM",
    vehicleId: "g550",
    hiddenPartIds: [],
    description: "Mercedes-Benz G550 donor geometry",
  },
};

export const buildPresetList = Object.values(buildPresets);

export function presetForVehicle(vehicleId: VehicleId): BuildPresetId {
  return vehicleId === "g550" ? "oem" : "retro";
}
