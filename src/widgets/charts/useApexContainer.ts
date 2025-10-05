"use client";

import { useEffect, useRef, useState } from "react";

type ApexContainerHook = {
  containerRef: React.RefObject<HTMLDivElement>;
  ready: boolean;
  width: number;
};

export function useApexContainer(): ApexContainerHook {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let observer: ResizeObserver | null = null;
    let cancelled = false;

    const commitWidth = (nextWidth: number) => {
      if (nextWidth <= 0) {
        return;
      }
      setWidth((prev) => (Math.abs(prev - nextWidth) < 0.5 ? prev : nextWidth));
      setReady(true);
    };

    const setup = () => {
      if (cancelled) return;
      const node = containerRef.current;
      if (!node) {
        requestAnimationFrame(setup);
        return;
      }

      if (typeof ResizeObserver === "undefined") {
        const measured = node.offsetWidth || node.getBoundingClientRect().width || 0;
        commitWidth(measured);
        return;
      }

      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        commitWidth(entry.contentRect.width);
      });

      observer.observe(node);
    };

    setup();

    return () => {
      cancelled = true;
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return { containerRef, ready, width };
}

export default useApexContainer;
