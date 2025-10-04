"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@/components/MaterialTailwind";
import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import { useOrdersUrgent } from "@/hooks/orders/useOrdersUrgent";
import { useChartReady } from "./useChartReady";
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";

type VerticalBarChartComponent =
  typeof import("@/widgets/charts/vertical-bar-chart").default;

const VerticalBarChart = dynamic(
  () => import("@/widgets/charts/vertical-bar-chart"),
  { ssr: false }
) as unknown as VerticalBarChartComponent;

const numberFormatter = new Intl.NumberFormat();
const KPI_CARDS: Array<{
  key: "totalOrders" | "openOrders" | "closedOrders" | "topSpendDept";
  title: string;
  subtitle?: string;
  icon: ReactNode;
}> = [
  {
    key: "totalOrders",
    title: "Total Orders",
    subtitle: "All purchase orders to date",
    icon: <ChartBarIcon className="tw-h-6 tw-w-6" />,
  },
  {
    key: "openOrders",
    title: "Open Orders",
    subtitle: "Currently in progress",
    icon: <ClipboardDocumentCheckIcon className="tw-h-6 tw-w-6" />,
  },
  {
    key: "closedOrders",
    title: "Closed Orders",
    subtitle: "Completed and received",
    icon: <CheckCircleIcon className="tw-h-6 tw-w-6" />,
  },
  {
    key: "topSpendDept",
    title: "Top Spend Dept",
    subtitle: "Highest purchase volume",
    icon: <BuildingOffice2Icon className="tw-h-6 tw-w-6" />,
  },
];

function renderKpiValue(
  key: (typeof KPI_CARDS)[number]["key"],
  value: number | string,
  isLoading: boolean
) {
  if (isLoading) {
    return "…";
  }

  if (key === "topSpendDept" && typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return numberFormatter.format(value);
  }

  return value;
}

export default function UrgentOrdersOverview() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const { kpis, status, byDept, isLoading, error } = useOrdersUrgent(period);
  const chartState = useChartReady();

  const statusSeriesHasValues = status.series.some((series) =>
    Array.isArray(series.data) && series.data.some((value) => value > 0)
  );
  const statusHasData = status.labels.length > 0 && statusSeriesHasValues;

  const byDeptHasData =
    byDept.labels.length > 0 && byDept.data.some((value) => value > 0);

  return (
    <section className="tw-space-y-6">
      {error ? (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-red-500"
        >
          Unable to load live urgent analytics. Showing defaults.
        </Typography>
      ) : null}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 xl:tw-grid-cols-4 tw-gap-6">
        {KPI_CARDS.map((card) => {
          let cardValue: number | string;

          switch (card.key) {
            case "totalOrders":
              cardValue = kpis.totalOrders;
              break;
            case "openOrders":
              cardValue = kpis.openOrders;
              break;
            case "closedOrders":
              cardValue = kpis.closedOrders;
              break;
            case "topSpendDept":
              cardValue = kpis.topSpendDept;
              break;
            default:
              cardValue = 0;
          }

          return (
            <BlackBoxKpiCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              value={renderKpiValue(card.key, cardValue, isLoading)}
              subtitle={card.subtitle}
            />
          );
        })}
      </div>

      <div className="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-3 xl:tw-flex-row xl:tw-items-center xl:tw-justify-between">
            <div className="tw-flex tw-flex-col">
              <Typography variant="h6" color="blue-gray">
                Orders by Status (Urgent focus)
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Total urgent orders segmented by SLA and state
              </Typography>
            </div>
            <div className="tw-flex tw-items-center tw-gap-2">
              {(
                [
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" },
                ] as Array<{ label: string; value: "daily" | "weekly" | "monthly" }>
              ).map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={period === option.value ? "filled" : "text"}
                  color={period === option.value ? "blue" : "blue-gray"}
                  className={period === option.value ? "tw-capitalize" : "tw-capitalize !tw-text-blue-gray-500"}
                  onClick={() => setPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {error ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-red-500"
              >
                Unable to load urgent status analytics.
              </Typography>
            ) : chartState === "pending" ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                Preparing chart…
              </Typography>
            ) : chartState === "unsupported" ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                Charts require ResizeObserver support
              </Typography>
            ) : !statusHasData ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                No data available
              </Typography>
            ) : (
              <VerticalBarChart
                height={320}
                series={status.series}
                options={{
                  chart: {
                    stacked: true,
                  },
                  xaxis: {
                    categories: status.labels,
                  },
                  legend: {
                    position: "top",
                  },
                  plotOptions: {
                    bar: {
                      borderRadius: 4,
                    },
                  },
                }}
              />
            )}
          </CardBody>
        </Card>

        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
          <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h6" color="blue-gray">
              Urgent Orders by Department
            </Typography>
            <Typography
              variant="small"
              className="!tw-font-normal !tw-text-blue-gray-500"
            >
              Comparison across departments
            </Typography>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {error ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-red-500"
              >
                Unable to load department analytics.
              </Typography>
            ) : chartState === "pending" ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                Preparing chart…
              </Typography>
            ) : chartState === "unsupported" ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                Charts require ResizeObserver support
              </Typography>
            ) : !byDeptHasData ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                No data available
              </Typography>
            ) : (
              <VerticalBarChart
                height={320}
                series={[{ name: "Urgent Orders", data: byDept.data }]}
                colors={["#f87171"]}
                options={{
                  xaxis: {
                    categories: byDept.labels,
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
