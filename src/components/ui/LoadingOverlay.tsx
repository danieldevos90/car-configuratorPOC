"use client";

import { useEffect, useState } from "react";
import { useLoadingOverlay } from "@/hooks/useLoadingOverlay";
import { MinimalLoadingScreen } from "./MinimalLoadingScreen";

const LEAVE_MS = 680;

type Props = {
  sceneReady: boolean;
};

export function LoadingOverlay({ sceneReady }: Props) {
  const { visible } = useLoadingOverlay(sceneReady);
  const [present, setPresent] = useState(true);

  useEffect(() => {
    if (visible) {
      setPresent(true);
      return;
    }
    const timeout = window.setTimeout(() => setPresent(false), LEAVE_MS);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!present) return null;

  return (
    <MinimalLoadingScreen
      className={`loading-screen--overlay${visible ? "" : " is-leaving"}`}
    />
  );
}
