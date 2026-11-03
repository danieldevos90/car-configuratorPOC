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
    const slot = vehicle.exclusiveGroups?.find(
      (group) => group.required && group.partIds.includes(partId),
    );
    const fallback = slot?.partIds.find((id) => id !== partId);
    if (fallback) hidden.delete(fallback);
  }
  return [...hidden];
}

/** Select the build's option in every required slot; free toggles are untouched. */
export function applyBuildVisibility(
  vehicle: VehicleDefinition,
  hiddenPartIds: readonly string[],
  buildId: string,
): string[] {
  const build = vehicle.builds?.find((item) => item.id === buildId);
  if (!build) return [...hiddenPartIds];
  const hidden = new Set(hiddenPartIds);
  for (const group of vehicle.exclusiveGroups ?? []) {
    if (!group.required) continue;
    const pick = group.partIds.find((id) => build.partIds.includes(id));
    if (!pick) continue;
    for (const id of group.partIds) {
      if (id === pick) hidden.delete(id);
      else hidden.add(id);
    }
  }
  return [...hidden];
}

export function activeBuildId(
  vehicle: VehicleDefinition,
  hiddenPartIds: readonly string[],
): string | null {
  const hidden = new Set(hiddenPartIds);
  const build = vehicle.builds?.find((item) =>
    item.partIds.every((id) => !hidden.has(id)),
  );
  return build?.id ?? null;
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
