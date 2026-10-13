import type { VehicleId } from "@/config/catalog";
import { GELANDE_OPTION_PART_IDS } from "@/config/gelande-kit-parts";

export type BuildPresetId = "retro" | "oem";

export type BuildPreset = {
  id: BuildPresetId;
  label: string;
  vehicleId: VehicleId;
  /** Extra parts hidden when applying this preset. */
  hiddenPartIds: string[];
  /** Parts shown even when defaultVisible is false (Gelände options). */
  forceVisiblePartIds?: string[];
  description: string;
};

/**
 * OEM = G550 base only. Retro = base + all Gelände kit parts (OEM wheels off).
 */
export const buildPresets: Record<BuildPresetId, BuildPreset> = {
  oem: {
    id: "oem",
    label: "OEM",
    vehicleId: "configured",
    hiddenPartIds: [],
    description: "Original Mercedes-Benz G550 — Gelände parts off",
  },
  retro: {
    id: "retro",
    label: "Gelände",
    vehicleId: "configured",
    hiddenPartIds: ["wheels"],
    forceVisiblePartIds: GELANDE_OPTION_PART_IDS,
    description: "Full Gelände Werke exterior package on the OEM base",
  },
};

export const buildPresetList = Object.values(buildPresets);

export function presetForVehicle(vehicleId: VehicleId): BuildPresetId {
  if (vehicleId === "g550" || vehicleId === "configured") return "oem";
  return "retro";
}
