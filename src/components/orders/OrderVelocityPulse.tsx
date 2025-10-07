"use client";

import ReactECharts from "echarts-for-react";
import { useState } from "react";

type PulseDatum = {
  day: string;
  orders: number;
};

const INITIAL_DATA: PulseDatum[] = [
  { day: "Mon", orders: 15 },
  { day: "Tue", orders: 21 },
  { day: "Wed", orders: 10 },
  { day: "Thu", orders: 26 },
  { day: "Fri", orders: 18 },
  { day: "Sat", orders: 5 },
];

export default function OrderVelocityPulse() {
  const [data] = useState<PulseDatum[]>(INITIAL_DATA);

  const option = {
    xAxis: {
      type: "category",
      data: data.map((d) => d.day),
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitLine: { show: false },
      axisLabel: { color: "#94a3b8" },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15,23,42,0.9)",
      textStyle: { color: "#f1f5f9" },
      borderWidth: 0,
      formatter: (params: any) => {
        const point = params?.[0];
        if (!point) return "";
        return `<b>${point.name}</b><br/>Orders: <b>${point.value}</b>`;
      },
    },
    grid: { top: 40, bottom: 40, left: 30, right: 30 },
    series: [
      {
        type: "line",
        smooth: true,
        data: data.map((d) => d.orders),
        lineStyle: {
          width: 3,
          color: "#3b82f6",
          shadowBlur: 10,
          shadowColor: "rgba(96,165,250,0.8)",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59,130,246,0.45)" },
              { offset: 1, color: "rgba(59,130,246,0.05)" },
            ],
          },
        },
        symbol: "circle",
        symbolSize: 14,
        itemStyle: {
          color: "#3b82f6",
          shadowBlur: 8,
          shadowColor: "rgba(96,165,250,0.8)",
        },
        emphasis: {
          itemStyle: {
            color: "#1d4ed8",
            borderColor: "#93c5fd",
            borderWidth: 3,
            shadowBlur: 15,
            shadowColor: "rgba(59,130,246,0.9)",
          },
        },
        animationDuration: 1800,
        animationEasing: "cubicOut",
        animationDelay: (idx: number) => idx * 120,
      },
    ],
    backgroundColor: "transparent",
  };

  return (
    <div className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white/70 tw-backdrop-blur-sm tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-items-baseline tw-justify-between tw-gap-4 tw-px-1 tw-pb-2">
        <h3 className="tw-text-[15px] tw-font-semibold tw-text-blue-gray-900">Order Velocity Pulse</h3>
        <span className="tw-text-xs tw-uppercase tw-tracking-wide tw-text-blue-gray-400">Pulsing performance trend</span>
      </div>
      <div className="tw-h-[360px]">
        <ReactECharts option={option as any} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
