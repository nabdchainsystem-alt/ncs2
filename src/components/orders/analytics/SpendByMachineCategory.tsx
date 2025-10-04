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

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

type VerticalBarChartComponent =
  typeof import("@/widgets/charts/vertical-bar-chart").default;

const VerticalBarChart = dynamic(
  () => import("@/widgets/charts/vertical-bar-chart"),
  { ssr: false }
) as unknown as VerticalBarChartComponent;

type MachineRow = {
  machine: string;
  total: number;
  sharePct: number;
};

type MachineSpendResponse = {
  rows: MachineRow[];
  currency: string;
};

const EMPTY_MACHINE_SPEND: MachineSpendResponse = {
  rows: [],
  currency: "SAR",
};

const formatCurrency = (value: number | undefined) =>
  `SAR ${currencyFormatter.format(Number(value ?? 0))}`;

const formatShare = (value: number | undefined) =>
  `${percentFormatter.format(Number(value ?? 0))}%`;

async function fetchMachineSpend(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return EMPTY_MACHINE_SPEND;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load machine spend for ${url}`);
  }
  return (await response.json()) as MachineSpendResponse;
}

export default function SpendByMachineCategory() {
  const chartState = useChartReady();
  const {
    data,
    error,
    isLoading,
  } = useSWR<MachineSpendResponse>(
    "/api/aggregates/orders/spend/by-machine",
    fetchMachineSpend
  );

  const rows = data?.rows ?? [];
  const hasData = rows.length > 0;

  return (
    <section className="tw-space-y-6">
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h6" color="blue-gray">
            Machine Spend Summary
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Cost distribution and share of total spend
          </Typography>
        </CardHeader>
        <CardBody className="tw-p-0">
          <div className="tw-overflow-x-auto">
            <table className="tw-min-w-full tw-table-auto tw-text-left">
              <thead>
                <tr>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    Machine
                  </th>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    Total Spend (SAR)
                  </th>
                  <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                    Share of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="tw-px-6 tw-py-6 tw-text-center tw-text-blue-gray-400" colSpan={3}>
                      Loading data…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="tw-px-6 tw-py-6 tw-text-center tw-text-red-500" colSpan={3}>
                      Unable to load machine spend data
                    </td>
                  </tr>
                ) : !hasData ? (
                  <tr>
                    <td className="tw-px-6 tw-py-6 tw-text-center tw-text-blue-gray-400" colSpan={3}>
                      No data available
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.machine} className="tw-border-t tw-border-blue-gray-50">
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-600 tw-font-semibold">
                        {row.machine}
                      </td>
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
                        {formatShare(row.sharePct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h6" color="blue-gray">
            Total Spend per Machine
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {error ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              Unable to load chart data.
            </Typography>
          ) : isLoading ? (
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
          ) : !hasData ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              No data available
            </Typography>
          ) : (
            <VerticalBarChart
              height={320}
              series={[{ name: "Total Spend", data: rows.map((row) => Number(row.total ?? 0)) }]}
              options={{
                xaxis: {
                  categories: rows.map((row) => row.machine),
                },
              }}
            />
          )}
        </CardBody>
      </Card>
    </section>
  );
}
