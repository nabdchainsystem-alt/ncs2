"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";

type Bucket = "daily" | "weekly" | "monthly";

type Kind = "requests" | "orders";

type Row = {
  label: string;
  new: number;
  pending: number;
  approved: number;
  closed: number;
};

const BUCKET_OPTIONS: Array<{ value: Bucket; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SPAN_BY_BUCKET: Record<Bucket, number> = {
  daily: 14,
  weekly: 12,
  monthly: 6,
};

const BAR_COLORS = {
  new: "rgba(59,130,246,0.8)",
  pending: "rgba(245,158,11,0.85)",
  approved: "rgba(16,185,129,0.8)",
};

const LINE_COLOR = "#8b5cf6";

async function fetchActivity(kind: Kind, bucket: Bucket, span: number) {
  const response = await fetch(`/api/activity?kind=${kind}&bucket=${bucket}&span=${span}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to load activity");
  }
  const json = (await response.json()) as { data?: Row[] };
  return Array.isArray(json.data) ? json.data : [];
}

export default function AuroraActivity({ kind }: { kind: Kind }) {
  const [bucket, setBucket] = useState<Bucket>("daily");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const span = SPAN_BY_BUCKET[bucket];

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchActivity(kind, bucket, span)
      .then((data) => {
        if (!ignore) {
          setRows(data);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : String(err));
          setRows([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [kind, bucket, span]);

  const categories = useMemo(() => rows.map((row) => row.label), [rows]);
  const newSeries = useMemo(() => rows.map((row) => row.new), [rows]);
  const pendingSeries = useMemo(() => rows.map((row) => row.pending), [rows]);
  const approvedSeries = useMemo(() => rows.map((row) => row.approved), [rows]);
  const closedSeries = useMemo(() => rows.map((row) => row.closed), [rows]);

  const hasData = useMemo(
    () => rows.some((row) => row.new + row.pending + row.approved + row.closed > 0),
    [rows]
  );

  const option = useMemo(() => {
    if (!hasData) {
      return null;
    }

    return {
      backgroundColor: "transparent",
      legend: {
        data: ["New", "Pending", "Approved", "Closed"],
        top: 10,
        right: 20,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#475569", fontSize: 12, fontWeight: 500 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderWidth: 0,
        padding: 12,
        textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: 500 },
        axisPointer: {
          type: "line",
          lineStyle: { width: 1.5, color: "rgba(148,163,184,0.45)" },
        },
      },
      grid: { top: 70, left: 40, right: 32, bottom: 40 },
      xAxis: {
        type: "category",
        data: categories,
        boundaryGap: true,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.35)" } },
        axisLabel: {
          color: "#64748b",
          rotate: categories.length > 10 ? 15 : 0,
        },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } },
      },
      series: [
        {
          name: "New",
          type: "bar",
          stack: "volume",
          data: newSeries,
          barMaxWidth: 28,
          itemStyle: { color: BAR_COLORS.new },
          emphasis: { focus: "series" },
        },
        {
          name: "Pending",
          type: "bar",
          stack: "volume",
          data: pendingSeries,
          barMaxWidth: 28,
          itemStyle: { color: BAR_COLORS.pending },
          emphasis: { focus: "series" },
        },
        {
          name: "Approved",
          type: "bar",
          stack: "volume",
          data: approvedSeries,
          barMaxWidth: 28,
          itemStyle: { color: BAR_COLORS.approved },
          emphasis: { focus: "series" },
        },
        {
          name: "Closed",
          type: "line",
          data: closedSeries,
          smooth: true,
          symbol: "circle",
          symbolSize: 9,
          lineStyle: {
            width: 3,
            color: LINE_COLOR,
            shadowBlur: 12,
            shadowColor: "rgba(139,92,246,0.45)",
          },
          itemStyle: { color: LINE_COLOR },
          areaStyle: { color: "rgba(139,92,246,0.08)" },
          emphasis: { focus: "series" },
        },
      ],
      animationDuration: 600,
    };
  }, [hasData, categories, newSeries, pendingSeries, approvedSeries, closedSeries]);

  const kindLabel = kind === "orders" ? "Orders" : "Requests";

  return (
    <div className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-pb-3">
        <div className="tw-flex tw-flex-col">
          <span className="tw-text-xs tw-uppercase tw-tracking-wide tw-text-blue-gray-400">
            Aurora Activity
          </span>
          <h3 className="tw-text-base tw-font-semibold tw-text-blue-gray-900">
            {kindLabel} lifecycle signals
          </h3>
        </div>
        <div className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-border tw-border-blue-gray-200 tw-bg-blue-gray-50 tw-p-1">
          {BUCKET_OPTIONS.map((optionItem) => {
            const isActive = bucket === optionItem.value;
            return (
              <button
                key={optionItem.value}
                type="button"
                className={`tw-rounded-full tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-transition focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-300 ${
                  isActive
                    ? "tw-bg-white tw-text-blue-gray-900 tw-shadow-sm"
                    : "tw-text-blue-gray-500 hover:tw-text-blue-gray-900"
                }`}
                onClick={() => setBucket(optionItem.value)}
              >
                {optionItem.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="tw-h-[360px]">
        {error ? (
          <div className="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded-lg tw-bg-red-50">
            <p className="tw-text-sm tw-font-medium tw-text-red-500">
              Unable to load activity: {error}
            </p>
          </div>
        ) : loading ? (
          <div className="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded-lg tw-bg-blue-gray-50">
            <p className="tw-text-sm tw-font-medium tw-text-blue-gray-400">
              Fetching latest signals…
            </p>
          </div>
        ) : !hasData || !option ? (
          <div className="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-rounded-lg tw-bg-blue-gray-50 tw-text-center">
            <p className="tw-text-sm tw-font-semibold tw-text-blue-gray-500">No activity yet</p>
            <p className="tw-text-xs tw-text-blue-gray-400">
              Interact with {kindLabel.toLowerCase()} to illuminate the timeline.
            </p>
          </div>
        ) : (
          <ReactECharts option={option as any} style={{ height: "100%", width: "100%" }} lazyUpdate />
        )}
      </div>
    </div>
  );
}
