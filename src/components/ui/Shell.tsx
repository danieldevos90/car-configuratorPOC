"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect } from "react";
import { useConfigurator } from "@/store/configurator-store";
import { AuditPanel } from "./AuditPanel";
import { CameraBar } from "./CameraBar";
import { ConfigRail } from "./ConfigRail";
import { TopBar } from "./TopBar";

const ConfiguratorCanvas = dynamic(
  () =>
    import("@/components/scene/ConfiguratorCanvas").then(
      (mod) => mod.ConfiguratorCanvas,
    ),
  { ssr: false, loading: () => <div className="scene-fallback" /> },
);

export function Shell() {
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
      <ConfiguratorCanvas />
      <TopBar />
      <ConfigRail />
      <CameraBar />
      <AuditPanel />
    </div>
  );
}
