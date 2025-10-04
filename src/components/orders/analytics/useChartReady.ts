"use client";

import { useEffect, useState } from "react";

export type ChartReadyState = "pending" | "ready" | "unsupported";

export function useChartReady() {
  const [state, setState] = useState<ChartReadyState>("pending");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof ResizeObserver === "undefined") {
      setState("unsupported");
      return;
    }

    setState("ready");
  }, []);

  return state;
}
