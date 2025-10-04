"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@/components/MaterialTailwind";
import { PieChart, VerticalBarChart } from "@/widgets/charts";

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
              <PieChart
                height={260}
                labels={shareChart.labels}
                series={shareChart.values}
                colors={["#0ea5e9", "#6366f1", "#22c55e", "#f97316", "#facc15", "#e11d48", "#9333ea", "#14b8a6"]}
                options={{
                  legend: {
                    show: true,
                    position: "bottom",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    labels: { colors: "#64748b" },
                  },
                }}
              />
              <div className="tw-text-center">
                <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                  Total requests
                </Typography>
                <Typography variant="h5" color="blue-gray">
                  {shareChart.total}
                </Typography>
              </div>
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
          )}
        </CardBody>
      </Card>
    </div>
  );
}
