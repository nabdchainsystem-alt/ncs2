"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";

type SpiralRow = {
  day: string;
  count: number;
  topStatus: string;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#3b82f6",
  ORDERED: "#06b6d4",
  RECEIVED: "#10b981",
  COMPLETED: "#22c55e",
  REJECTED: "#ef4444",
};

const CARD_CLASSES =
  "tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-4 tw-shadow-sm";

function buildOption(rows: SpiralRow[]) {
  const angleAxisData = rows.map((row) => row.day);
  const seriesData = rows.map((row) => ({
    value: [row.day, row.count],
    itemStyle: {
      color: STATUS_COLOR[row.topStatus] ?? "#94a3b8",
    },
  }));

  return {
    angleAxis: {
      type: "category",
      data: angleAxisData,
      boundaryGap: false,
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      splitLine: { show: false },
    },
    radiusAxis: {
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.3)" } },
    },
    polar: {},
    tooltip: {
      formatter: (params: any) => {
        const row = rows[params.dataIndex];
        return `<b>${row.day}</b><br/>Requests: <b>${row.count}</b><br/>Top stage: <b>${row.topStatus}</b>`;
      },
    },
    series: [
      {
        type: "bar",
        coordinateSystem: "polar",
        data: seriesData,
        roundCap: true,
        animationDuration: 900,
        animationEasing: "cubicOut",
      },
    ],
  };
}

export default function RequestsSpiralMap() {
  const [rows, setRows] = useState<SpiralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/requests/spiral", { cache: "no-store" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to load spiral data");
        }
        const json = await response.json();
        if (!alive) return;
        setRows(Array.isArray(json?.data) ? json.data : []);
      } catch (error) {
        if (!alive) return;
        setErr(error instanceof Error ? error.message : "Failed to load spiral data");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const option = useMemo(() => (rows.length > 0 ? buildOption(rows) : null), [rows]);

  if (loading) {
    return (
      <div className={`${CARD_CLASSES} tw-h-[360px] tw-flex tw-items-center tw-justify-center`}>
        <span className="tw-text-blue-gray-400">Loading spiral…</span>
      </div>
    );
  }

  if (err || !option) {
    return (
      <div className={`${CARD_CLASSES} tw-h-[360px] tw-flex tw-items-center tw-justify-center tw-text-center`}>
        <div>
          <p className="tw-text-blue-gray-900 tw-font-semibold">No spiral data yet</p>
          <p className="tw-text-sm tw-text-blue-gray-400">Create requests to populate the spiral timeline.</p>
          {err ? <p className="tw-mt-2 tw-text-xs tw-text-red-400">{err}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={CARD_CLASSES}>
      <div className="tw-flex tw-items-baseline tw-justify-between tw-gap-4 tw-px-1 tw-pb-2">
        <h3 className="tw-text-[15px] tw-font-semibold tw-text-blue-gray-900">Requests Spiral Activity</h3>
        <span className="tw-text-xs tw-uppercase tw-tracking-wide tw-text-blue-gray-400">
          Polar timeline • dominant stage colour
        </span>
      </div>
      <div className="tw-h-[360px]">
        <ReactECharts option={option as any} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
