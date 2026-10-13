import type { ConfigPart, VehicleDefinition } from "@/config/catalog";

export function defaultHiddenPartIds(vehicle: VehicleDefinition): string[] {
  return vehicle.parts.filter((part) => !part.defaultVisible).map((part) => part.id);
}

/** Show/hide a part; optional exclusive groups keep one option per group visible. */
export function togglePartVisibility(
  vehicle: VehicleDefinition,
  hiddenPartIds: readonly string[],
  partId: string,
): string[] {
  const hidden = new Set(hiddenPartIds);
  const part = vehicle.parts.find((item) => item.id === partId);
  if (!part) return [...hidden];

  const willShow = hidden.has(partId);
  if (willShow) {
    hidden.delete(partId);
    for (const group of vehicle.exclusiveGroups ?? []) {
      if (!group.partIds.includes(partId)) continue;
      for (const otherId of group.partIds) {
        if (otherId !== partId) hidden.add(otherId);
      }
    }
  } else {
    hidden.add(partId);
  }
  return [...hidden];
}

export function visiblePartIds(
  vehicle: VehicleDefinition,
  hiddenPartIds: readonly string[],
): Set<string> {
  const hidden = new Set(hiddenPartIds);
  return new Set(vehicle.parts.filter((part) => !hidden.has(part.id)).map((part) => part.id));
}

export function partsForCategory(parts: ConfigPart[], category: ConfigPart["category"]) {
  return parts.filter((part) => part.category === category);
}
