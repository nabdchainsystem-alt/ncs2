"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@/components/MaterialTailwind";
import { VerticalBarChart } from "@/widgets/charts";

const RANGE_OPTIONS = [
  { label: "Weekly", value: "weekly" as const },
  { label: "Monthly", value: "monthly" as const },
];

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

type DepartmentSeriesEntry = {
  id: string;
  label: string;
  count: number;
};

type DepartmentActivityResponse = {
  total: Record<RangeValue, DepartmentSeriesEntry[]>;
  urgent: Record<RangeValue, DepartmentSeriesEntry[]>;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load department analytics");
  }
  return response.json() as Promise<DepartmentActivityResponse>;
};

type RangeToggleProps = {
  value: RangeValue;
  onChange: (value: RangeValue) => void;
};

function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div className="tw-inline-flex tw-rounded-full tw-border tw-border-blue-gray-100 tw-bg-blue-gray-50">
      {RANGE_OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (!isActive) {
                onChange(option.value);
              }
            }}
            className={`tw-rounded-full tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-uppercase tw-transition-colors focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-amber-500 focus:tw-ring-offset-2 ${
              isActive
                ? "tw-bg-gray-900 tw-text-white"
                : "tw-text-blue-gray-500 hover:tw-text-blue-gray-700"
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function sortSeries(entries: DepartmentSeriesEntry[]) {
  return [...entries].sort((a, b) => b.count - a.count);
}

function extractChartData(entries: DepartmentSeriesEntry[]) {
  const labels = entries.map((entry) => entry.label);
  const values = entries.map((entry) => entry.count);
  const total = values.reduce((sum, value) => sum + value, 0);
  return { labels, values, total };
}

function computeTopSummary(data: { labels: string[]; values: number[]; total: number }) {
  if (!data.total || data.total <= 0 || data.values.length === 0) {
    return null;
  }

  let topIndex = 0;
  for (let i = 1; i < data.values.length; i += 1) {
    if (data.values[i] > data.values[topIndex]) {
      topIndex = i;
    }
  }

  const topValue = data.values[topIndex] ?? 0;
  const topLabel = data.labels[topIndex] ?? "—";
  const percentage = data.total ? (topValue / data.total) * 100 : 0;

  return {
    label: topLabel,
    value: topValue,
    percentage,
  };
}

function SummarySection({
  total,
  summary,
  label,
  color,
}: {
  total: number;
  summary: ReturnType<typeof computeTopSummary> | null;
  label: string;
  color: "blue" | "cyan" | "red";
}) {
  const colorClasses: Record<"blue" | "cyan" | "red", string> = {
    blue: "tw-bg-blue-100 tw-text-blue-700",
    cyan: "tw-bg-cyan-100 tw-text-cyan-700",
    red: "tw-bg-red-100 tw-text-red-700",
  };

  return (
    <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4">
      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
        {label}
      </Typography>
      <div className="tw-mt-1 tw-flex tw-items-center tw-gap-2">
        <Typography variant="h6" color="blue-gray">
          {total}
        </Typography>
        {summary ? (
          <span
            className={`tw-inline-flex tw-items-center tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase ${colorClasses[color]}`}
          >
            {`${summary.percentage.toFixed(0)}% ${summary.label.toUpperCase()}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function RequestsDepartmentCharts() {
  const { data, error, isLoading } = useSWR<DepartmentActivityResponse>(
    "/api/requests/analytics/department-activity",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const [totalRange, setTotalRange] = useState<RangeValue>("weekly");
  const [shareRange, setShareRange] = useState<RangeValue>("weekly");
  const [urgentRange, setUrgentRange] = useState<RangeValue>("weekly");

  const sortedTotal = useMemo(
    () => sortSeries(data?.total?.[totalRange] ?? []),
    [data?.total, totalRange]
  );
  const sortedShare = useMemo(
    () => sortSeries(data?.total?.[shareRange] ?? []),
    [data?.total, shareRange]
  );
  const sortedUrgent = useMemo(
    () => sortSeries(data?.urgent?.[urgentRange] ?? []),
    [data?.urgent, urgentRange]
  );

  const totalChart = useMemo(() => extractChartData(sortedTotal), [sortedTotal]);
  const shareChart = useMemo(() => extractChartData(sortedShare), [sortedShare]);
  const urgentChart = useMemo(() => extractChartData(sortedUrgent), [sortedUrgent]);
  const totalSummary = useMemo(() => computeTopSummary(totalChart), [totalChart]);
  const shareSummary = useMemo(() => computeTopSummary(shareChart), [shareChart]);
  const urgentSummary = useMemo(() => computeTopSummary(urgentChart), [urgentChart]);

  const isInitialLoading = !data && isLoading;

  const renderState = (chartTotal: number, isEmpty: boolean) => {
    if (error) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
          Unable to load chart data
        </Typography>
      );
    }

    if (isInitialLoading) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          Loading chart…
        </Typography>
      );
    }

    if (isEmpty || chartTotal === 0) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          No requests captured in this range.
        </Typography>
      );
    }

    return null;
  };

  return (
    <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-3">
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Total Requests by Department
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Requests created in the selected window
            </Typography>
          </div>
          <RangeToggle value={totalRange} onChange={setTotalRange} />
        </CardHeader>
        <CardBody className="tw-p-4">
          {renderState(totalChart.total, sortedTotal.length === 0) ?? (
            <div className="tw-space-y-4">
              <VerticalBarChart
                height={280}
                colors={["#6366f1"]}
                series={[{ name: "Requests", data: totalChart.values }]}
                options={{
                  xaxis: {
                    categories: totalChart.labels,
                  },
                }}
              />
              <SummarySection
                total={totalChart.total}
                summary={totalSummary}
                label="Total requests this range"
                color="blue"
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Requests by Department
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Share of requests in the selected window
            </Typography>
          </div>
          <RangeToggle value={shareRange} onChange={setShareRange} />
        </CardHeader>
        <CardBody className="tw-p-4">
          {renderState(shareChart.total, sortedShare.length === 0) ?? (
            <div className="tw-space-y-4">
              <VerticalBarChart
                height={280}
                colors={["#0ea5e9"]}
                series={[{ name: "Requests", data: shareChart.values }]}
                options={{
                  xaxis: {
                    categories: shareChart.labels,
                  },
                }}
              />
              <SummarySection
                total={shareChart.total}
                summary={shareSummary}
                label="Total requests"
                color="cyan"
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Urgent Requests by Department
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Urgent volume in the selected window
            </Typography>
          </div>
          <RangeToggle value={urgentRange} onChange={setUrgentRange} />
        </CardHeader>
        <CardBody className="tw-p-4">
          {renderState(urgentChart.total, sortedUrgent.length === 0) ?? (
            <div className="tw-space-y-4">
              <VerticalBarChart
                height={280}
                colors={["#f87171"]}
                series={[{ name: "Urgent", data: urgentChart.values }]}
                options={{
                  xaxis: {
                    categories: urgentChart.labels,
                  },
                }}
              />
              <SummarySection
                total={urgentChart.total}
                summary={urgentSummary}
                label="Total urgent requests"
                color="red"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
