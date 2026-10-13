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
    vehicleId: "master",
    hiddenPartIds: ["preset-oem"],
    description: "Gelände Werke restomod with full kit",
  },
  oem: {
    id: "oem",
    label: "OEM",
    vehicleId: "master",
    hiddenPartIds: ["preset-retro"],
    description: "Mercedes-Benz G550 donor geometry",
  },
};

export const buildPresetList = Object.values(buildPresets);

export function presetForVehicle(vehicleId: VehicleId): BuildPresetId {
  if (vehicleId === "g550") return "oem";
  return "retro";
}
