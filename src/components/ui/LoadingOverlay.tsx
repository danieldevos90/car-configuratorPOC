"use client";

import { useLoadingOverlay } from "@/hooks/useLoadingOverlay";
import { MinimalLoadingScreen } from "./MinimalLoadingScreen";

type Props = {
  sceneReady: boolean;
};

export function LoadingOverlay({ sceneReady }: Props) {
  const { visible } = useLoadingOverlay(sceneReady);

  if (!visible) return null;

  return <MinimalLoadingScreen className="loading-screen--overlay" />;
}
