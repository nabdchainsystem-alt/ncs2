"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import { useMemo } from "react";

import { useWarehouseSummary } from "@/hooks/useWarehouseSummary";

const BAR_COLORS = {
  in: "url(#flowIn)",
  low: "url(#flowLow)",
  out: "url(#flowOut)",
};

const cardClasses =
  "tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-shadow-sm tw-transition-shadow tw-duration-200 hover:tw-shadow-md";

export default function WarehouseFlowChart() {
  const { data, loading, err } = useWarehouseSummary();

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((warehouse) => ({
      name: warehouse.name,
      inStock: Number(warehouse.inStock.toFixed(2)),
      lowStock: Number(warehouse.lowStock.toFixed(2)),
      outStock: Number(warehouse.outStock.toFixed(2)),
      totalValueSar: Number(warehouse.totalValueSar.toFixed(2)),
    }));
  }, [data]);

  if (loading) {
    return (
      <div className={`${cardClasses} tw-p-6 tw-h-[380px] tw-flex tw-items-center tw-justify-center`}>
        <span className="tw-text-blue-gray-400">Loading warehouse summary…</span>
      </div>
    );
  }

  if (err || !chartData || chartData.length === 0) {
    return (
      <div className={`${cardClasses} tw-p-8 tw-h-[380px] tw-flex tw-items-center tw-justify-center tw-text-center`}>
        <div>
          <p className="tw-text-blue-gray-900 tw-font-semibold">Warehouse flow insights coming soon</p>
          <p className="tw-text-sm tw-text-blue-gray-400">
            Add inventory movements to visualise warehouse health here.
          </p>
          {err ? <p className="tw-mt-2 tw-text-xs tw-text-red-400">{err}</p> : null}
        </div>
      </div>
    );
  }

  const tooltipFormatter = (value: number, name: string) => {
    if (name === "Inventory Value (SAR)") {
      return [`SAR ${Number(value ?? 0).toLocaleString()}`, name];
    }
    return [`${Number(value ?? 0).toLocaleString()} units`, name];
  };

  const axisValueFormatter = (value: number) => `${Number(value ?? 0).toLocaleString()} units`;
  const axisCurrencyFormatter = (value: number) => `SAR ${(Number(value ?? 0) / 1000).toFixed(0)}k`;

  return (
    <div className={`${cardClasses} tw-p-4 tw-space-y-4`}>
      <div className="tw-flex tw-items-baseline tw-justify-between tw-gap-4">
        <h3 className="tw-text-[15px] tw-font-semibold tw-text-blue-gray-900">Warehouse Flow Overview</h3>
        <span className="tw-text-xs tw-uppercase tw-tracking-wide tw-text-blue-gray-400">
          Bars: Stock Health • Line: Value (SAR)
        </span>
      </div>
      <div className="tw-h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} barSize={28}>
            <defs>
              <linearGradient id="flowIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="flowLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="flowOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0.55} />
              </linearGradient>
              <filter id="flowGlow" x="-15%" y="-15%" width="130%" height="140%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#475569" }}
              tickMargin={12}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={axisValueFormatter}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={axisCurrencyFormatter}
            />
            <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            <Bar
              yAxisId="left"
              dataKey="outStock"
              stackId="stack"
              name="Out of Stock"
              fill={BAR_COLORS.out}
              animationDuration={600}
            >
              {chartData.map((_, idx) => (
                <Cell key={`out-${idx}`} filter="url(#flowGlow)" radius={[0, 0, 6, 6]} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="lowStock"
              stackId="stack"
              name="Low Stock"
              fill={BAR_COLORS.low}
              animationDuration={600}
            >
              {chartData.map((_, idx) => (
                <Cell key={`low-${idx}`} filter="url(#flowGlow)" radius={[0, 0, 0, 0]} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="inStock"
              stackId="stack"
              name="In Stock"
              fill={BAR_COLORS.in}
              animationDuration={600}
            >
              {chartData.map((_, idx) => (
                <Cell key={`in-${idx}`} filter="url(#flowGlow)" radius={[6, 6, 0, 0]} />
              ))}
            </Bar>

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalValueSar"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
              name="Inventory Value (SAR)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
