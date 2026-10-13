"use client";

import { useConfigurator } from "@/store/configurator-store";

/** Higher DPR on desktop Wi‑Fi; keeps phones closer to 1× to avoid GPU OOM. */
export function useSceneDpr(): [number, number] {
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const highDetail = useConfigurator((s) => s.highDetail);
  if (isCompactDevice) return highDetail ? [1, 1.25] : [1, 1];
  return highDetail ? [1, 2] : [1, 1.5];
}
