"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Typography,
} from "@/components/MaterialTailwind";
import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import {
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { useChartReady } from "./useChartReady";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat();

type MixedChartComponent = typeof import("@/widgets/charts/mixed-chart").default;

const MixedChart = dynamic(
  () => import("@/widgets/charts/mixed-chart"),
  { ssr: false }
) as unknown as MixedChartComponent;

type MonthlyCardsResponse = {
  totalOrders: number;
  spendThisMonth: number;
  changePct: number;
  currency: string;
};

type MonthlyTrendResponse = {
  labels: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  currency: string;
};

const DEFAULT_CARDS: MonthlyCardsResponse = {
  totalOrders: 0,
  spendThisMonth: 0,
  changePct: 0,
  currency: "SAR",
};

const DEFAULT_TREND: MonthlyTrendResponse = {
  labels: [],
  series: [],
  currency: "SAR",
};

async function fetchMonthlyCards(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return DEFAULT_CARDS;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load monthly cards for ${url}`);
  }
  return (await response.json()) as MonthlyCardsResponse;
}

async function fetchMonthlyTrend(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return DEFAULT_TREND;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load monthly trend for ${url}`);
  }
  return (await response.json()) as MonthlyTrendResponse;
}

export default function MonthlyTrendsSection() {
  const chartState = useChartReady();

  const {
    data: cards,
    error: cardsError,
    isLoading: cardsLoading,
  } = useSWR<MonthlyCardsResponse>(
    "/api/aggregates/orders/monthly-cards",
    fetchMonthlyCards
  );

  const {
    data: trend,
    error: trendError,
    isLoading: trendLoading,
  } = useSWR<MonthlyTrendResponse>(
    "/api/aggregates/orders/monthly-trend",
    fetchMonthlyTrend
  );

  const cardsData = cards ?? DEFAULT_CARDS;
  const trendData = trend ?? DEFAULT_TREND;

  const hasTrendData =
    trendData.labels.length > 0 &&
    trendData.series.some((series) => series.data.some((value) => value > 0));

  const changeValue = cardsData.changePct;
  const changeLabel = `${changeValue > 0 ? "+" : ""}${percentFormatter.format(changeValue)}%`;
  const changeColor = changeValue >= 0 ? "green" : "red";

  return (
    <section className="tw-space-y-6">
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6">
        <BlackBoxKpiCard
          icon={<ChartBarIcon className="tw-h-6 tw-w-6" />}
          title="Total Orders This Month"
          value={
            cardsError
              ? "—"
              : cardsLoading
              ? "…"
              : numberFormatter.format(cardsData.totalOrders)
          }
          subtitle={cardsError ? "Unable to load metric." : "Orders created this month"}
        />
        <BlackBoxKpiCard
          icon={<CurrencyDollarIcon className="tw-h-6 tw-w-6" />}
          title="Spend This Month (SAR)"
          value={
            cardsError
              ? "—"
              : cardsLoading
              ? "…"
              : `SAR ${currencyFormatter.format(cardsData.spendThisMonth)}`
          }
          subtitle={cardsError ? "Unable to load metric." : "Invoiced closed orders"}
        />
        <BlackBoxKpiCard
          icon={<ArrowPathIcon className="tw-h-6 tw-w-6" />}
          title="% Change vs Last Month"
          value={
            cardsError
              ? "—"
              : cardsLoading
              ? "…"
              : changeLabel
          }
          subtitle={cardsError ? "Unable to load metric." : changeValue >= 0 ? "Above last month" : "Below last month"}
        />
      </div>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h6" color="blue-gray">
            Orders & Spend per Month
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Rolling 12-month trend
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {trendError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              Unable to load trend data.
            </Typography>
          ) : trendLoading ? (
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
          ) : !hasTrendData ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              No data available
            </Typography>
          ) : (
            <MixedChart
              height={340}
              series={[
                {
                  name: "Orders",
                  type: "column",
                  data: trendData.series.find((series) => series.name === "Orders")?.data ?? [],
                },
                {
                  name: "Spend (SAR)",
                  type: "line",
                  data:
                    trendData.series.find((series) => series.name === "Spend (SAR)")?.data ?? [],
                },
              ]}
              options={{
                xaxis: {
                  categories: trendData.labels,
                },
                stroke: {
                  width: [0, 4],
                },
                dataLabels: {
                  enabled: false,
                },
                legend: {
                  show: true,
                  position: "top",
                },
                yaxis: [
                  {
                    title: {
                      text: "Orders",
                    },
                  },
                  {
                    opposite: true,
                    title: {
                      text: "Spend (SAR)",
                    },
                  },
                ],
              }}
            />
          )}
        </CardBody>
      </Card>
    </section>
  );
}
