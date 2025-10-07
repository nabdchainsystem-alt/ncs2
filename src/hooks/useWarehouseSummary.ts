"use client";

import { useEffect, useMemo, useState } from "react";

export type WarehouseSummaryRow = {
  name: string;
  inStock: number;
  lowStock: number;
  outStock: number;
  totalValueSar: number;
};

export function useWarehouseSummary() {
  const [data, setData] = useState<WarehouseSummaryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/warehouse/summary", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Unable to load warehouse summary");
        }
        const json = await res.json();
        if (!alive) return;
        const rows = Array.isArray(json?.data) ? json.data : [];
        setData(rows);
      } catch (error) {
        if (!alive) return;
        setErr(error instanceof Error ? error.message : "Failed to load warehousing data");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!data) return null;
    return [...data].sort((a, b) => b.totalValueSar - a.totalValueSar);
  }, [data]);

  return { data: sorted, loading, err };
}
