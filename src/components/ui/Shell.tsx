"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DESKTOP_MEDIA } from "@/lib/scene-quality";
import { viewStillCandidates } from "@/config/nature-scenes";
import { vehicles } from "@/config/catalog";
import { useConfigurator } from "@/store/configurator-store";
import { AuditPanel } from "./AuditPanel";
import { CameraBar, SceneThumbs } from "./CameraBar";
import { ConfigRail } from "./ConfigRail";
import { LoadingOverlay } from "./LoadingOverlay";
import { Navbar11 } from "@/components/navbar11";

const ConfiguratorCanvas = dynamic(
  () =>
    import("@/components/scene/ConfiguratorCanvas").then(
      (mod) => mod.ConfiguratorCanvas,
    ),
  {
    ssr: false,
    loading: () => <div className="scene-fallback" aria-hidden />,
  },
);

function StageStill({ sources }: { sources: string[] }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<string | null>(null);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const listKey = sources.join("|");
  const [listSeen, setListSeen] = useState(listKey);
  if (listSeen !== listKey) {
    setListSeen(listKey);
    setIndex(0);
  }

  useEffect(() => {
    if (!shown) return;
    return () => setOutgoing(shown);
  }, [shown]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(() => setOutgoing(null), 760);
    return () => window.clearTimeout(timer);
  }, [outgoing]);

  const src = sources[index];
  const frameRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame && frame.complete && frame.naturalWidth > 0) setShown(src);
  }, [src]);

  if (!src && !shown && !outgoing) return null;

  return (
    <div className="scene-still-stack">
      {outgoing ? <img className="scene-still" src={outgoing} alt="" /> : null}
      {src ? (
        <img
          key={src}
          ref={frameRef}
          className={`scene-still ${outgoing ? "is-entering" : ""}`}
          src={src}
          alt=""
          style={{ opacity: shown === src ? 1 : 0 }}
          onLoad={() => setShown(src)}
          onError={() => setIndex((current) => current + 1)}
        />
      ) : null}
    </div>
  );
}

export function Shell() {
  const [sceneReady, setSceneReady] = useState(false);
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const auditOpen = useConfigurator((s) => s.auditOpen);
  const studioId = useConfigurator((s) => s.studioId);
  const stageMode = useConfigurator((s) => s.stageMode);
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  const cameraId = useConfigurator((s) => s.cameraId);
  const paintId = useConfigurator((s) => s.paintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const wheelId = vehicles[vehicleId].exclusiveGroups
    ?.find((group) => group.id === "wheels")
    ?.partIds.find((id) => !hiddenPartIds.includes(id));
  const wheelKey = wheelId?.endsWith("-wheels") ? wheelId.slice(0, -"-wheels".length) : "";
  const stillSources =
    stageMode === "image" && wheelKey
      ? viewStillCandidates(cameraId, paintId, wheelKey, studioId, interiorId)
      : [];
  const bootstrapScene = useConfigurator((s) => s.bootstrapScene);
  const syncViewport = useConfigurator((s) => s.syncViewport);
  const setPanelOpen = useConfigurator((s) => s.setPanelOpen);
  const show3d = stageMode === "3d" && !isCompactDevice;

  useEffect(() => {
    if (!show3d) setSceneReady(false);
  }, [show3d]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!new URLSearchParams(window.location.search).has("shots")) return;
    (window as unknown as { __gw?: typeof useConfigurator }).__gw = useConfigurator;
  }, []);

  useLayoutEffect(() => {
    bootstrapScene();
    const query = window.matchMedia(DESKTOP_MEDIA);
    const onViewport = () => {
      syncViewport();
      if (query.matches) setPanelOpen(true);
    };
    query.addEventListener("change", onViewport);
    return () => query.removeEventListener("change", onViewport);
  }, [bootstrapScene, setPanelOpen, syncViewport]);

  return (
    <div
      className={`app-shell ${panelOpen ? "is-panel-open" : ""} ${auditOpen ? "is-audit-open" : ""}`}
      data-studio={studioId}
      suppressHydrationWarning
    >
      <Navbar11 />
      <div className="stage-frame">
        {show3d ? (
          <ConfiguratorCanvas onReady={() => setSceneReady(true)} />
        ) : (
          <div className="scene-fallback" aria-hidden />
        )}
        {stillSources.length ? <StageStill sources={stillSources} /> : null}
        {show3d ? <LoadingOverlay sceneReady={sceneReady} /> : null}
        <CameraBar />
        <SceneThumbs />
      </div>
      <ConfigRail />
      <AuditPanel />
    </div>
  );
}
