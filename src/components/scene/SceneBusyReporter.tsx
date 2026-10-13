"use client";

import { useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useConfigurator } from "@/store/configurator-store";

type Props = {
  pending: boolean;
};

export function SceneBusyReporter({ pending }: Props) {
  const active = useProgress((state) => state.active);
  const setSceneLoading = useConfigurator((s) => s.setSceneLoading);

  useEffect(() => {
    setSceneLoading(pending || active);
  }, [pending, active, setSceneLoading]);

  return null;
}
