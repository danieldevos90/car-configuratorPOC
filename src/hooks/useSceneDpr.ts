"use client";

import { useEffect, useState } from "react";

/** Higher DPR on desktop pointers; keeps mobile closer to 1.5 for performance. */
export function useSceneDpr(): [number, number] {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    setDpr(finePointer && !narrow ? [1, 2] : [1, 1.5]);
  }, []);

  return dpr;
}
