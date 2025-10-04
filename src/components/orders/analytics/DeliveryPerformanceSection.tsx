"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@/components/MaterialTailwind";
import { useChartReady } from "./useChartReady";

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const delayFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type PieChartComponent = typeof import("@/widgets/charts/pie-chart").default;
type VerticalBarChartComponent =
  typeof import("@/widgets/charts/vertical-bar-chart").default;

const PieChart = dynamic(
  () => import("@/widgets/charts/pie-chart"),
  { ssr: false }
) as unknown as PieChartComponent;

const VerticalBarChart = dynamic(
  () => import("@/widgets/charts/vertical-bar-chart"),
  { ssr: false }
) as unknown as VerticalBarChartComponent;

type DeliverySummaryRow = {
  vendor: string;
  deliveries: number;
  onTimePct: number;
  avgDelayDays: number;
};

type DeliverySummaryResponse = {
  rows: DeliverySummaryRow[];
};

type DeliveryOutcomesResponse = {
  labels: string[];
  data: number[];
};

type VendorsOnTimeResponse = {
  labels: string[];
  data: number[];
};

const EMPTY_SUMMARY: DeliverySummaryResponse = {
  rows: [],
};

const EMPTY_OUTCOMES: DeliveryOutcomesResponse = {
  labels: [],
  data: [],
};

const EMPTY_VENDOR_ON_TIME: VendorsOnTimeResponse = {
  labels: [],
  data: [],
};

async function fetchSummary(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return EMPTY_SUMMARY;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load delivery summary for ${url}`);
  }
  return (await response.json()) as DeliverySummaryResponse;
}

async function fetchOutcomes(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return EMPTY_OUTCOMES;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load delivery outcomes for ${url}`);
  }
  return (await response.json()) as DeliveryOutcomesResponse;
}

async function fetchVendorsOnTime(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return EMPTY_VENDOR_ON_TIME;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load vendors on-time performance for ${url}`);
  }
  return (await response.json()) as VendorsOnTimeResponse;
}

export default function DeliveryPerformanceSection() {
  const chartState = useChartReady();

  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
  } = useSWR<DeliverySummaryResponse>(
    "/api/aggregates/orders/delivery/summary",
    fetchSummary
  );

  const {
    data: outcomes,
    error: outcomesError,
    isLoading: outcomesLoading,
  } = useSWR<DeliveryOutcomesResponse>(
    "/api/aggregates/orders/delivery/outcomes",
    fetchOutcomes
  );

  const {
    data: vendorsOnTime,
    error: vendorsOnTimeError,
    isLoading: vendorsOnTimeLoading,
  } = useSWR<VendorsOnTimeResponse>(
    "/api/aggregates/orders/delivery/vendors-on-time",
    fetchVendorsOnTime
  );

  const rows = summary?.rows ?? [];
  const hasSummaryData = rows.length > 0;
  const outcomesHasData =
    (outcomes?.labels.length ?? 0) > 0 && outcomes?.data.some((value) => value > 0);
  const vendorsOnTimeHasData =
    (vendorsOnTime?.labels.length ?? 0) > 0 &&
    vendorsOnTime?.data.some((value) => value > 0);

  return (
    <section className="tw-space-y-6">
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h6" color="blue-gray">
            Vendor Delivery Summary
          </Typography>
        </CardHeader>
        <CardBody className="tw-p-0">
          <div className="tw-overflow-x-auto">
            <table className="tw-min-w-full tw-table-auto tw-text-left">
              <thead>
                <tr>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    Vendor
                  </th>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    Deliveries
                  </th>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    On-Time %
                  </th>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    Avg Delay (days)
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  <tr>
                    <td className="tw-px-6 tw-py-6 tw-text-center tw-text-blue-gray-400" colSpan={4}>
                      Loading data…
                    </td>
                  </tr>
                ) : summaryError ? (
                  <tr>
                    <td className="tw-px-6 tw-py-6 tw-text-center tw-text-red-500" colSpan={4}>
                      Unable to load delivery summary
                    </td>
                  </tr>
                ) : !hasSummaryData ? (
                  <tr>
                    <td className="tw-px-6 tw-py-6 tw-text-center tw-text-blue-gray-400" colSpan={4}>
                      No data available
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.vendor} className="tw-border-t tw-border-blue-gray-50">
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-600 tw-font-semibold">
                        {row.vendor}
                      </td>
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
                        {row.deliveries}
                      </td>
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
                        {percentFormatter.format(row.onTimePct)}%
                      </td>
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
                        {delayFormatter.format(row.avgDelayDays)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              On-Time vs Delayed Deliveries
            </Typography>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {outcomesError ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                Unable to load delivery outcome data.
              </Typography>
            ) : outcomesLoading ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Loading chart…
              </Typography>
            ) : chartState === "pending" ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Preparing chart…
              </Typography>
            ) : chartState === "unsupported" ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Charts require ResizeObserver support
              </Typography>
            ) : !outcomesHasData ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                No data available
              </Typography>
            ) : (
              <PieChart
                height={320}
                series={outcomes?.data ?? []}
                labels={outcomes?.labels}
                options={{ legend: { show: true, position: "bottom" } }}
              />
            )}
          </CardBody>
        </Card>

        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Vendors by On-Time %
            </Typography>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {vendorsOnTimeError ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                Unable to load vendor performance data.
              </Typography>
            ) : vendorsOnTimeLoading ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Loading chart…
              </Typography>
            ) : chartState === "pending" ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Preparing chart…
              </Typography>
            ) : chartState === "unsupported" ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Charts require ResizeObserver support
              </Typography>
            ) : !vendorsOnTimeHasData ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                No data available
              </Typography>
            ) : (
              <VerticalBarChart
                height={320}
                series={[{ name: "On-Time %", data: vendorsOnTime?.data ?? [] }]}
                options={{
                  xaxis: {
                    categories: vendorsOnTime?.labels ?? [],
                  },
                  yaxis: {
                    max: 100,
                    labels: {
                      formatter: (value: number) => `${percentFormatter.format(value)}%`,
                    },
                  },
                }}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
