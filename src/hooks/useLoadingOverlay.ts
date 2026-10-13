"use client";

import { useConfigurator } from "@/store/configurator-store";

/** Used by dynamic import fallback if we ever re-introduce a delayed hint. */
export const LOADING_OVERLAY_DELAY_MS = 200;

export function useLoadingOverlay(sceneReady: boolean) {
  const sceneLoading = useConfigurator((s) => s.sceneLoading);
  const busy = !sceneReady || sceneLoading;
  return { visible: busy };
}
