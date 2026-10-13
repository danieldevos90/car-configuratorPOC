"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import { useConfigurator } from "@/store/configurator-store";

type Props = {
  pending: boolean;
};

export function SceneBusyReporter({ pending }: Props) {
  const setSceneLoading = useConfigurator((s) => s.setSceneLoading);
  const pendingRef = useRef(pending);
  const reportedRef = useRef<boolean | null>(null);
  pendingRef.current = pending;

  useEffect(() => {
    let cancelled = false;
    let queued = false;

    const publish = () => {
      // Environment's useLoader writes this store during render. A sync
      // setState here updates SceneBusyReporter while EnvironmentCube renders.
      if (cancelled || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (cancelled) return;
        const next = pendingRef.current || useProgress.getState().active;
        if (reportedRef.current === next) return;
        reportedRef.current = next;
        setSceneLoading(next);
      });
    };

    publish();
    const unsubscribe = useProgress.subscribe(publish);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pending, setSceneLoading]);

  return null;
}
