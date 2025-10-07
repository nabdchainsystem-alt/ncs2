"use client";

import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

import type { Bucket } from "@/server/dateBuckets";
import { useAuroraActivity } from "@/hooks/useAuroraActivity";
import { SparklesIcon } from "@heroicons/react/24/outline";

const SIGNAL_ORDER = ["New", "Pending", "Approved", "Closed"] as const;

type Signal = (typeof SIGNAL_ORDER)[number];

type Props = {
  entity: "requests" | "orders";
  title?: string;
  subtitle?: string;
};

type SeriesPoint = {
  name: Signal;
  data: number[];
};

type SignalPalette = {
  line: string;
  area: [string, string];
  glow: string;
};

const SIGNAL_PALETTE: Record<Signal, SignalPalette> = {
  New: {
    line: "#38bdf8",
    area: ["rgba(14,165,233,0.45)", "rgba(14,165,233,0.05)"],
    glow: "rgba(56,189,248,0.6)",
  },
  Pending: {
    line: "#f97316",
    area: ["rgba(249,115,22,0.42)", "rgba(249,115,22,0.04)"],
    glow: "rgba(249,115,22,0.5)",
  },
  Approved: {
    line: "#34d399",
    area: ["rgba(52,211,153,0.42)", "rgba(52,211,153,0.04)"],
    glow: "rgba(52,211,153,0.55)",
  },
  Closed: {
    line: "#a855f7",
    area: ["rgba(168,85,247,0.45)", "rgba(168,85,247,0.05)"],
    glow: "rgba(168,85,247,0.55)",
  },
};

const BUCKET_OPTIONS: Array<{ value: Bucket; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function buildSeries(series: SeriesPoint[]) {
  return series.map((row) => {
    const palette = SIGNAL_PALETTE[row.name];
    return {
      name: row.name,
      type: "line",
      smooth: true,
      data: row.data,
      symbol: "circle",
      symbolSize: 8,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: palette.line,
        shadowBlur: 12,
        shadowColor: palette.glow,
      },
      itemStyle: {
        color: palette.line,
      },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: palette.area[0] },
            { offset: 1, color: palette.area[1] },
          ],
        },
      },
      emphasis: {
        focus: "series",
      },
      animationDuration: 900,
      animationDelay: (_index: number) => (
        SIGNAL_ORDER.indexOf(row.name) >= 0 ? SIGNAL_ORDER.indexOf(row.name) * 80 : 0
      ),
    };
  });
}

function buildOption(labels: string[], series: SeriesPoint[]) {
  return {
    backgroundColor: "transparent",
    grid: { top: 90, left: 40, right: 20, bottom: 50 },
    legend: {
      data: series.map((row) => row.name),
      left: "center",
      top: 40,
      icon: "circle",
      itemHeight: 10,
      itemWidth: 10,
      textStyle: { color: "#475569", fontWeight: 500 },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15,23,42,0.92)",
      borderWidth: 0,
      padding: 12,
      textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: 500 },
      axisPointer: {
        type: "line",
        lineStyle: {
          color: "rgba(148,163,184,0.35)",
          width: 2,
          type: "dashed",
        },
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const date = params[0]?.axisValueLabel ?? "";
        const points = params
          .map((entry: any) => {
            const palette = SIGNAL_PALETTE[entry.seriesName as Signal] ?? SIGNAL_PALETTE.New;
            return `<span style="display:inline-flex;align-items:center;gap:6px;line-height:1.4;">`
              + `<span style="width:10px;height:10px;border-radius:9999px;background:${palette.line};"></span>`
              + `${entry.seriesName}: <strong>${entry.data ?? 0}</strong>`
              + `</span>`;
          })
          .join("<br/>");
        return `<div style="display:flex;flex-direction:column;gap:8px;">`
          + `<span style="font-size:13px;letter-spacing:0.4px;text-transform:uppercase;color:#94a3b8;">${date}</span>`
          + points
          + `</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLabel: {
        color: "#64748b",
        rotate: labels.length > 10 ? 15 : 0,
      },
      axisTick: { show: false },
      axisLine: {
        lineStyle: { color: "rgba(148,163,184,0.35)" },
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } },
      axisTick: { show: false },
    },
    series: buildSeries(series),
  };
}

export default function AuroraActivityCard({ entity, title, subtitle }: Props) {
  const [bucket, setBucket] = useState<Bucket>("daily");
  const { data, error, isLoading } = useAuroraActivity(entity, bucket);

  const hasData = useMemo(
    () => data.series.some((series) => series.data.some((value) => value > 0)),
    [data.series]
  );

  const option = useMemo(() => {
    if (!hasData) return null;
    return buildOption(data.labels, data.series as SeriesPoint[]);
  }, [data.labels, data.series, hasData]);

  const fallbackUsed = useMemo(
    () => SIGNAL_ORDER.some((signal) => data.meta[signal]?.source === "fallback"),
    [data.meta]
  );

  const resolvedTitle =
    title ?? `Aurora Activity — ${entity === "requests" ? "Requests" : "Orders"}`;
  const resolvedSubtitle =
    subtitle ??
    (entity === "requests"
      ? "Flow of requests transitioning across key states"
      : "Order lifecycle pulses across fulfillment stages");

  return (
    <div className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-gradient-to-br tw-from-white tw-via-white/90 tw-to-blue-50/40 tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-start lg:tw-justify-between">
        <div className="tw-flex tw-flex-col tw-gap-2">
          <div className="tw-flex tw-items-center tw-gap-2">
            <span className="tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-full tw-bg-blue-50">
              <SparklesIcon className="tw-h-4 tw-w-4 tw-text-blue-500" />
            </span>
            <div>
              <h3 className="tw-text-base tw-font-semibold tw-text-blue-gray-900">{resolvedTitle}</h3>
              <p className="tw-text-xs tw-uppercase tw-tracking-wide tw-text-blue-gray-400">{resolvedSubtitle}</p>
            </div>
          </div>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            {SIGNAL_ORDER.map((signal) => {
              const palette = SIGNAL_PALETTE[signal];
              const total = data.meta[signal]?.total ?? 0;
              return (
                <span
                  key={signal}
                  className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-white/80 tw-px-3 tw-py-1 tw-text-xs tw-font-medium tw-text-blue-gray-600 tw-shadow-sm"
                >
                  <span
                    className="tw-h-2 tw-w-2 tw-rounded-full"
                    style={{ backgroundColor: palette.line }}
                  />
                  {signal}
                  <span className="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-blue-gray-400">
                    {total}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="tw-flex tw-items-center tw-gap-2">
          {BUCKET_OPTIONS.map((optionItem) => {
            const isActive = bucket === optionItem.value;
            return (
              <button
                key={optionItem.value}
                type="button"
                onClick={() => setBucket(optionItem.value)}
                className={`tw-rounded-full tw-border tw-px-4 tw-py-1.5 tw-text-sm tw-font-medium tw-transition focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-300 ${
                  isActive
                    ? "tw-border-blue-500 tw-bg-blue-500 tw-text-white tw-shadow"
                    : "tw-border-blue-gray-200 tw-bg-white tw-text-blue-gray-500 hover:tw-border-blue-300"
                }`}
              >
                {optionItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {fallbackUsed ? (
        <div className="tw-mt-4 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-medium tw-text-blue-gray-400">
          <span className="tw-inline-flex tw-h-2 tw-w-2 tw-rounded-full tw-bg-amber-400 tw-shadow-[0_0_0_2px_rgba(251,191,36,0.25)]" />
          Some signals are synthesized from live records while activity logs are unavailable.
        </div>
      ) : null}

      <div className="tw-mt-4 tw-h-[360px]">
        {error ? (
          <div className="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded-lg tw-bg-white/70">
            <p className="tw-text-sm tw-font-medium tw-text-red-500">Unable to load Aurora activity.</p>
          </div>
        ) : isLoading ? (
          <div className="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded-lg tw-bg-white/60">
            <p className="tw-text-sm tw-font-medium tw-text-blue-gray-400">Synthesizing Aurora timeline…</p>
          </div>
        ) : !hasData || !option ? (
          <div className="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-rounded-lg tw-bg-white/70 tw-text-center">
            <p className="tw-text-sm tw-font-semibold tw-text-blue-gray-500">No Aurora signals yet</p>
            <p className="tw-text-xs tw-text-blue-gray-400">
              Engage with {entity === "requests" ? "requests" : "orders"} to illuminate the chart.
            </p>
          </div>
        ) : (
          <ReactECharts
            option={option as any}
            style={{ height: "100%", width: "100%" }}
            notMerge
            lazyUpdate
          />
        )}
      </div>
    </div>
  );
}
