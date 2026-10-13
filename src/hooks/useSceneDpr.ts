"use client";

import { sceneDprRange } from "@/lib/scene-quality";
import { useConfigurator } from "@/store/configurator-store";

export function useSceneDpr(): [number, number] {
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const highDetail = useConfigurator((s) => s.highDetail);
  return sceneDprRange(isCompactDevice, highDetail);
}
