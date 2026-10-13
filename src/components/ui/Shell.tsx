"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";
import { DESKTOP_MEDIA, subscribeNetworkQuality } from "@/lib/scene-quality";
import { useConfigurator } from "@/store/configurator-store";
import { AuditPanel } from "./AuditPanel";
import { CameraBar } from "./CameraBar";
import { ConfigRail } from "./ConfigRail";
import { LoadingOverlay } from "./LoadingOverlay";
import { DelayedSceneFallback } from "./DelayedSceneFallback";
import { TopBar } from "./TopBar";

const ConfiguratorCanvas = dynamic(
  () =>
    import("@/components/scene/ConfiguratorCanvas").then(
      (mod) => mod.ConfiguratorCanvas,
    ),
  {
    ssr: false,
    loading: () => <DelayedSceneFallback />,
  },
);

export function Shell() {
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneBooted, setSceneBooted] = useState(false);
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const auditOpen = useConfigurator((s) => s.auditOpen);
  const studioId = useConfigurator((s) => s.studioId);
  const bootstrapScene = useConfigurator((s) => s.bootstrapScene);
  const syncNetworkQuality = useConfigurator((s) => s.syncNetworkQuality);
  const setPanelOpen = useConfigurator((s) => s.setPanelOpen);

  useLayoutEffect(() => {
    bootstrapScene();
    setSceneBooted(true);
    const stopNetwork = subscribeNetworkQuality(syncNetworkQuality);
    const query = window.matchMedia(DESKTOP_MEDIA);
    const openOnDesktop = () => {
      if (query.matches) setPanelOpen(true);
    };
    query.addEventListener("change", openOnDesktop);
    return () => {
      stopNetwork();
      query.removeEventListener("change", openOnDesktop);
    };
  }, [bootstrapScene, setPanelOpen, syncNetworkQuality]);

  return (
    <div
      className={`app-shell ${panelOpen ? "is-panel-open" : ""} ${auditOpen ? "is-audit-open" : ""}`}
      data-studio={studioId}
      suppressHydrationWarning
    >
      {sceneBooted ? (
        <ConfiguratorCanvas onReady={() => setSceneReady(true)} />
      ) : (
        <DelayedSceneFallback />
      )}
      <LoadingOverlay sceneReady={sceneReady} />
      <TopBar />
      <ConfigRail />
      <CameraBar />
      <AuditPanel />
    </div>
  );
}
