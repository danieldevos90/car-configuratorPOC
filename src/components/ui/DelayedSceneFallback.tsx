"use client";

import { MinimalLoadingScreen } from "./MinimalLoadingScreen";

export function DelayedSceneFallback() {
  return <MinimalLoadingScreen className="scene-fallback" />;
}
