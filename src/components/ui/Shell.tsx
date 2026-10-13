"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";
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
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const auditOpen = useConfigurator((s) => s.auditOpen);
  const studioId = useConfigurator((s) => s.studioId);
  const setPanelOpen = useConfigurator((s) => s.setPanelOpen);

  useLayoutEffect(() => {
    const query = window.matchMedia("(min-width: 901px)");
    const openOnDesktop = () => {
      if (query.matches) setPanelOpen(true);
    };
    openOnDesktop();
    query.addEventListener("change", openOnDesktop);
    return () => query.removeEventListener("change", openOnDesktop);
  }, [setPanelOpen]);

  return (
    <div
      className={`app-shell ${panelOpen ? "is-panel-open" : ""} ${auditOpen ? "is-audit-open" : ""}`}
      data-studio={studioId}
    >
      <ConfiguratorCanvas onReady={() => setSceneReady(true)} />
      <LoadingOverlay sceneReady={sceneReady} />
      <TopBar />
      <ConfigRail />
      <CameraBar />
      <AuditPanel />
    </div>
  );
}
