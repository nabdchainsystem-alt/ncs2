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

type BarChartComponent = typeof import("@/widgets/charts/vertical-bar-chart").default;

const VerticalBarChartComponent = dynamic(
  () => import("@/widgets/charts/vertical-bar-chart"),
  { ssr: false }
) as unknown as BarChartComponent;

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number | undefined) => `SAR ${currencyFormatter.format(Number(value ?? 0))}`;

type SpendRow = {
  material?: string;
  vendor?: string;
  orders: number;
  total: number;
  avg: number;
};

type SpendTableResponse = {
  rows: SpendRow[];
  currency: string;
};

type SpendDistributionResponse = {
  labels: string[];
  data: number[];
  currency: string;
};

const EMPTY_TABLE: SpendTableResponse = {
  rows: [],
  currency: "SAR",
};

const EMPTY_DISTRIBUTION: SpendDistributionResponse = {
  labels: [],
  data: [],
  currency: "SAR",
};

async function fetchTable(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return EMPTY_TABLE;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load spend analytics for ${url}`);
  }
  return (await response.json()) as SpendTableResponse;
}

async function fetchDistribution(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return EMPTY_DISTRIBUTION;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load spend distribution for ${url}`);
  }
  return (await response.json()) as SpendDistributionResponse;
}

export default function SpendAnalysisClosedOrders() {
  const chartState = useChartReady();

  const {
    data: materials,
    error: materialsError,
    isLoading: materialsLoading,
  } = useSWR<SpendTableResponse>(
    "/api/aggregates/orders/spend/top-materials?limit=10",
    fetchTable
  );

  const {
    data: vendors,
    error: vendorsError,
    isLoading: vendorsLoading,
  } = useSWR<SpendTableResponse>(
    "/api/aggregates/orders/spend/top-vendors?limit=10",
    fetchTable
  );

  const {
    data: materialsDistribution,
    error: materialsDistributionError,
    isLoading: materialsDistributionLoading,
  } = useSWR<SpendDistributionResponse>(
    "/api/aggregates/orders/spend/materials-distribution",
    fetchDistribution
  );

  const {
    data: vendorsDistribution,
    error: vendorsDistributionError,
    isLoading: vendorsDistributionLoading,
  } = useSWR<SpendDistributionResponse>(
    "/api/aggregates/orders/spend/vendors-distribution",
    fetchDistribution
  );

  const materialRows = materials?.rows ?? [];
  const vendorRows = vendors?.rows ?? [];

  const materialsHasData = materialRows.length > 0;
  const vendorsHasData = vendorRows.length > 0;
  const materialsDistributionHasData =
    (materialsDistribution?.labels.length ?? 0) > 0 &&
    materialsDistribution?.data.some((value) => value > 0);
  const vendorsDistributionHasData =
    (vendorsDistribution?.labels.length ?? 0) > 0 &&
    vendorsDistribution?.data.some((value) => value > 0);

  const renderTableState = (
    isLoading: boolean,
    error: Error | undefined,
    hasData: boolean,
    rows: SpendRow[],
    type: "material" | "vendor"
  ) => {
    if (isLoading) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-6 tw-text-center tw-text-blue-gray-400" colSpan={4}>
            Loading data…
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-6 tw-text-center tw-text-red-500" colSpan={4}>
            Unable to load {type === "material" ? "material" : "vendor"} data
          </td>
        </tr>
      );
    }

    if (!hasData) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-6 tw-text-center tw-text-blue-gray-400" colSpan={4}>
            No data available
          </td>
        </tr>
      );
    }

    return rows.slice(0, 10).map((row, index) => (
      <tr key={`${type}-${index}`} className="tw-border-t tw-border-blue-gray-50">
        <td className="tw-px-6 tw-py-3 tw-text-blue-gray-600 tw-font-semibold">
          {type === "material" ? row.material : row.vendor}
        </td>
        <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
          {row.orders}
        </td>
        <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
          {formatCurrency(row.total)}
        </td>
        <td className="tw-px-6 tw-py-3 tw-text-blue-gray-500">
          {formatCurrency(row.avg)}
        </td>
      </tr>
    ));
  };

  const renderDistributionState = (
    isLoading: boolean,
    error: Error | undefined,
    hasData: boolean,
    data: SpendDistributionResponse | undefined
  ) => {
    if (error) {
      return (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-red-500"
        >
          Unable to load distribution data.
        </Typography>
      );
    }

    if (isLoading) {
      return (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-blue-gray-400"
        >
          Loading chart…
        </Typography>
      );
    }

    if (chartState === "pending") {
      return (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-blue-gray-400"
        >
          Preparing chart…
        </Typography>
      );
    }

    if (chartState === "unsupported") {
      return (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-blue-gray-400"
        >
          Charts require ResizeObserver support
        </Typography>
      );
    }

    if (!hasData || !data) {
      return (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-blue-gray-400"
        >
          No data available
        </Typography>
      );
    }

    return (
      <VerticalBarChartComponent
        height={320}
        series={[{ name: "Spend", data: data.data }]}
        options={{
          xaxis: {
            categories: data.labels,
          },
          legend: { show: false },
          plotOptions: {
            bar: {
              columnWidth: "45%",
              borderRadius: 4,
            },
          },
        }}
      />
    );
  };

  return (
    <section className="tw-space-y-6">
      <div className="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Top 10 Materials
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Closed order volume and spend
            </Typography>
          </CardHeader>
          <CardBody className="tw-p-0">
            <div className="tw-overflow-x-auto">
              <table className="tw-min-w-full tw-table-auto tw-text-left">
                <thead>
                  <tr>
                    <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                      Material
                    </th>
                    <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                      Orders (#)
                    </th>
                    <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                      Total Spend (SAR)
                    </th>
                    <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                      Avg Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableState(
                    materialsLoading,
                    materialsError as Error | undefined,
                    materialsHasData,
                    materialRows,
                    "material"
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Top 10 Vendors
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Closed order spend by supplier
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
                      Orders (#)
                    </th>
                    <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                      Total Spend (SAR)
                    </th>
                    <th className="tw-px-6 tw-py-3 tw-text-xs tw-uppercase !tw-text-blue-gray-500 !tw-font-medium">
                      Avg Order Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableState(
                    vendorsLoading,
                    vendorsError as Error | undefined,
                    vendorsHasData,
                    vendorRows,
                    "vendor"
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Top Materials by Spend (SAR)
            </Typography>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {renderDistributionState(
              materialsDistributionLoading,
              materialsDistributionError as Error | undefined,
              Boolean(materialsDistributionHasData),
              materialsDistribution ?? EMPTY_DISTRIBUTION
            )}
          </CardBody>
        </Card>

        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Top Vendors by Spend (SAR)
            </Typography>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {renderDistributionState(
              vendorsDistributionLoading,
              vendorsDistributionError as Error | undefined,
              Boolean(vendorsDistributionHasData),
              vendorsDistribution ?? EMPTY_DISTRIBUTION
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
