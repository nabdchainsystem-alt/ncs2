"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import useSWR from "swr";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Option,
  Select,
  Typography,
} from "@/components/MaterialTailwind";
import WarehouseHero from "@/components/warehouse/WarehouseHero";
import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ChartPieIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxArrowDownIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useChartReady } from "@/components/orders/analytics/useChartReady";

type WarehouseOverviewResponse = {
  lowStock: number;
  outOfStock: number;
  inventoryValueSar: number;
  totalItems: number;
};

type PriorityValue = "Low" | "Normal" | "High" | "Urgent";
type InventoryStatusValue = "NORMAL" | "LOW" | "OUT";

type CompletedLineRow = {
  id: string;
  poNo: string;
  vendorName: string;
  vendorId: string;
  itemName: string;
  materialCode: string | null;
  qty: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
  requestPriority: PriorityValue;
  transferStatus: "PENDING" | "PROCESSED";
  inventoryStatus: InventoryStatusValue;
  createdAt: string;
};

type CompletedLinesResponse = {
  count: number;
  rows: CompletedLineRow[];
};

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load data");
  }
  return response.json() as Promise<T>;
};

const numberFormatter = new Intl.NumberFormat();
const qtyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
});

const priorityColorMap: Record<PriorityValue, "blue-gray" | "blue" | "amber" | "red"> = {
  Low: "blue-gray",
  Normal: "blue",
  High: "amber",
  Urgent: "red",
};

const inventoryStatusColor: Record<InventoryStatusValue, "blue-gray" | "amber" | "red"> = {
  NORMAL: "blue-gray",
  LOW: "amber",
  OUT: "red",
};

const inventoryStatusLabel: Record<InventoryStatusValue, string> = {
  NORMAL: "Normal",
  LOW: "Low Stock",
  OUT: "Out of Stock",
};

const parseNumeric = (value: string | number) => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type VerticalBarChartComponent =
  typeof import("@/widgets/charts/vertical-bar-chart").default;
type PieChartComponent = typeof import("@/widgets/charts/pie-chart").default;

const VerticalBarChart = dynamic(
  () => import("@/widgets/charts/vertical-bar-chart"),
  { ssr: false }
) as unknown as VerticalBarChartComponent;

const PieChart = dynamic(() => import("@/widgets/charts/pie-chart"), {
  ssr: false,
}) as unknown as PieChartComponent;

const INVENTORY_QUICK_FILTERS = [
  "All",
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Raw Material",
  "Spare Parts Machine",
  "Minerals",
  "Chemicals",
] as const;

type InventoryQuickFilter = (typeof INVENTORY_QUICK_FILTERS)[number];

const MOVEMENT_SEGMENTS = ["All", "Inbound", "Outbound", "Transfer"] as const;

type MovementSegment = (typeof MOVEMENT_SEGMENTS)[number];

const INVENTORY_TABLE_COLUMNS = [
  "PIC",
  "CATEGORY",
  "ITEM CODE",
  "ITEM DESCRIPTION",
  "QUANTITY",
  "UNIT",
  "STORE",
  "ACTIONS",
] as const;

const MOVEMENTS_TABLE_COLUMNS = [
  "DATE",
  "ITEM",
  "SOURCE",
  "DESTINATION",
  "STORE",
  "TYPE",
  "QTY",
  "VALUE",
  "ORDER",
] as const;

const hasPositiveValues = (values: number[]) =>
  values.length > 0 && values.some((value) => value > 0);

export default function WarehousePage() {
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryQuickFilter>("All");
  const [inventorySearch, setInventorySearch] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementSegment, setMovementSegment] =
    useState<MovementSegment>("All");
  const [storeFilter, setStoreFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const chartState = useChartReady();

  const {
    data: overviewData,
    error: overviewError,
    isLoading: overviewLoading,
  } = useSWR<WarehouseOverviewResponse>(
    "/api/aggregates/warehouse/overview",
    jsonFetcher
  );

  const {
    data: completedLinesData,
    error: completedLinesError,
    isLoading: completedLinesLoading,
  } = useSWR<CompletedLinesResponse>(
    "/api/warehouse/completed-lines?status=pending",
    jsonFetcher
  );

  const pendingLinesCount = completedLinesData?.count ?? 0;
  const completedLinesRows = completedLinesData?.rows ?? [];
  const hasCompletedLines = completedLinesRows.length > 0;
  const pendingLinesDisplay = completedLinesLoading
    ? "…"
    : numberFormatter.format(pendingLinesCount);

  const renderChartContent = (
    hasData: boolean,
    render: () => ReactNode
  ): ReactNode => {
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

    if (!hasData) {
      return (
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-blue-gray-400"
        >
          No data available yet.
        </Typography>
      );
    }

    return render();
  };

  const lowVsOut = null as
    | { labels: string[]; low: number[]; out: number[] }
    | null;
  const itemsPerWarehouse = null as
    | { labels: string[]; data: number[] }
    | null;
  const statusDistribution = null as
    | { labels: string[]; data: number[] }
    | null;
  const valueByCategory = null as
    | { labels: string[]; data: number[] }
    | null;
  const criticalByCategory = null as
    | { labels: string[]; data: number[] }
    | null;
  const criticalByWarehouse = null as
    | { labels: string[]; data: number[] }
    | null;
  const excessByCategory = null as
    | { labels: string[]; data: number[] }
    | null;
  const topSlowItems = null as
    | { labels: string[]; data: number[] }
    | null;
  const utilizationShare = null as
    | { labels: string[]; data: number[] }
    | null;
  const capacityVsUsed = null as
    | { labels: string[]; capacity: number[]; used: number[] }
    | null;

  const lowVsOutHasData =
    !!lowVsOut &&
    lowVsOut.labels.length > 0 &&
    (hasPositiveValues(lowVsOut.low) || hasPositiveValues(lowVsOut.out));
  const itemsPerWarehouseHasData =
    !!itemsPerWarehouse &&
    itemsPerWarehouse.labels.length > 0 &&
    hasPositiveValues(itemsPerWarehouse.data);
  const statusDistributionHasData =
    !!statusDistribution &&
    statusDistribution.labels.length > 0 &&
    hasPositiveValues(statusDistribution.data);
  const valueByCategoryHasData =
    !!valueByCategory &&
    valueByCategory.labels.length > 0 &&
    hasPositiveValues(valueByCategory.data);
  const criticalByCategoryHasData =
    !!criticalByCategory &&
    criticalByCategory.labels.length > 0 &&
    hasPositiveValues(criticalByCategory.data);
  const criticalByWarehouseHasData =
    !!criticalByWarehouse &&
    criticalByWarehouse.labels.length > 0 &&
    hasPositiveValues(criticalByWarehouse.data);
  const excessByCategoryHasData =
    !!excessByCategory &&
    excessByCategory.labels.length > 0 &&
    hasPositiveValues(excessByCategory.data);
  const topSlowItemsHasData =
    !!topSlowItems &&
    topSlowItems.labels.length > 0 &&
    hasPositiveValues(topSlowItems.data);
  const utilizationShareHasData =
    !!utilizationShare &&
    utilizationShare.labels.length > 0 &&
    hasPositiveValues(utilizationShare.data);
  const capacityVsUsedHasData =
    !!capacityVsUsed &&
    capacityVsUsed.labels.length > 0 &&
    (hasPositiveValues(capacityVsUsed.capacity) ||
      hasPositiveValues(capacityVsUsed.used));

  const overviewErrorSubtitle = overviewError
    ? "Unable to load overview metrics"
    : undefined;

  const overviewMetrics = overviewData ?? null;

  const inventoryOverviewCards = [
    {
      title: "LOW STOCK",
      icon: <ExclamationTriangleIcon className="tw-h-6 tw-w-6" />,
      subtitle: overviewErrorSubtitle ?? "Below safety thresholds",
      value: overviewLoading
        ? "…"
        : overviewMetrics
        ? numberFormatter.format(overviewMetrics.lowStock)
        : undefined,
    },
    {
      title: "OUT OF STOCK",
      icon: <XCircleIcon className="tw-h-6 tw-w-6" />,
      subtitle: overviewErrorSubtitle ?? "Unavailable SKUs",
      value: overviewLoading
        ? "…"
        : overviewMetrics
        ? numberFormatter.format(overviewMetrics.outOfStock)
        : undefined,
    },
    {
      title: "INVENTORY VALUE (SAR)",
      icon: <BanknotesIcon className="tw-h-6 tw-w-6" />,
      subtitle: overviewErrorSubtitle ?? "Valued at landed cost",
      value: overviewLoading
        ? "…"
        : overviewMetrics
        ? currencyFormatter.format(overviewMetrics.inventoryValueSar)
        : undefined,
    },
    {
      title: "TOTAL ITEMS",
      icon: <Squares2X2Icon className="tw-h-6 tw-w-6" />,
      subtitle: overviewErrorSubtitle ?? "Across all warehouses",
      value: overviewLoading
        ? "…"
        : overviewMetrics
        ? numberFormatter.format(overviewMetrics.totalItems)
        : undefined,
    },
  ] as const;

  const inventoryDetailsCards = [
    {
      title: "TOTAL SKUS",
      icon: <ClipboardDocumentListIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Unique materials tracked",
    },
    {
      title: "INVENTORY VALUE (SAR)",
      icon: <BanknotesIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Gross inventory value",
    },
    {
      title: "AVERAGE UNIT COST",
      icon: <ChartBarIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Weighted across SKUs",
    },
    {
      title: "IN-STOCK %",
      icon: <CheckCircleIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Availability across network",
    },
  ] as const;

  const criticalAlertCards = [
    {
      title: "CRITICAL ITEMS",
      icon: <ExclamationTriangleIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Flagged for action",
    },
    {
      title: "CRITICAL OUT OF STOCK",
      icon: <XCircleIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Zero balance",
    },
    {
      title: "CRITICAL LOW STOCK",
      icon: <BoltIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Below reorder level",
    },
    {
      title: "LINKED REQUESTS",
      icon: <ClipboardDocumentCheckIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Pending approvals",
    },
  ] as const;

  const slowMovingCards = [
    {
      title: "SLOW-MOVING ITEMS",
      icon: <ClockIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Low consumption pace",
    },
    {
      title: "SLOW-MOVING VALUE (SAR)",
      icon: <BanknotesIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Capital tied up",
    },
    {
      title: "EXCESS STOCK",
      icon: <ArchiveBoxIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Above optimum levels",
    },
    {
      title: "EXCESS STOCK VALUE (SAR)",
      icon: <ChartBarIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Value of excess",
    },
  ] as const;

  const utilizationCards = [
    {
      title: "TOTAL CAPACITY",
      icon: <BuildingOffice2Icon className="tw-h-6 tw-w-6" />,
      subtitle: "Across all facilities",
    },
    {
      title: "USED CAPACITY",
      icon: <TruckIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Occupied space",
    },
    {
      title: "FREE CAPACITY",
      icon: <ArrowsRightLeftIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Available allocation",
    },
    {
      title: "UTILIZATION %",
      icon: <ChartPieIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Usage vs capacity",
    },
  ] as const;

  return (
    <>
      <section className="tw-mt-6">
        <WarehouseHero />
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Inventory Overview
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Real-time health of stock levels
          </Typography>
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {inventoryOverviewCards.map((card) => (
            <BlackBoxKpiCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
            />
          ))}
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-12">
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Low vs Out of Stock
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Stacked visibility across categories
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(lowVsOutHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    { name: "Low Stock", data: lowVsOut?.low ?? [] },
                    { name: "Out of Stock", data: lowVsOut?.out ?? [] },
                  ]}
                  options={{
                    chart: { stacked: true },
                    xaxis: { categories: lowVsOut?.labels ?? [] },
                    legend: { show: true },
                  }}
                />
              ))}
            </CardBody>
          </Card>
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Items per Warehouse
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Distribution of stock across facilities
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(itemsPerWarehouseHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Items",
                      data: itemsPerWarehouse?.data ?? [],
                    },
                  ]}
                  options={{
                    xaxis: { categories: itemsPerWarehouse?.labels ?? [] },
                    legend: { show: false },
                  }}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Completed Orders Transfer
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Review completed purchase order lines before they hit inventory
          </Typography>
        </div>
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardBody className="tw-space-y-6">
            <div className="tw-flex tw-items-center tw-gap-3">
              <InboxArrowDownIcon className="tw-h-6 tw-w-6 tw-text-blue-gray-400" />
              <Typography
                variant="small"
                className="!tw-font-semibold !tw-text-blue-gray-500"
              >
                Pending lines: <span className="tw-text-blue-gray-900 tw-font-semibold">{pendingLinesDisplay}</span> awaiting action
              </Typography>
            </div>
            {completedLinesError ? (
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-red-500"
              >
                Unable to load pending transfers. Please try again later.
              </Typography>
            ) : completedLinesLoading ? (
              <div className="tw-flex tw-min-h-[180px] tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-dashed tw-border-blue-gray-100 tw-bg-blue-gray-50/50">
                <Typography
                  variant="small"
                  className="!tw-font-normal !tw-text-blue-gray-400"
                >
                  Loading pending transfers…
                </Typography>
              </div>
            ) : hasCompletedLines ? (
              <div className="tw-overflow-x-auto tw-rounded-lg tw-border tw-border-blue-gray-100">
                <table className="tw-w-full tw-min-w-[720px] tw-table-auto">
                  <thead className="tw-bg-blue-gray-50/60">
                    <tr>
                      <th className="tw-px-6 tw-py-3 tw-text-left">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          PO NO
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3 tw-text-left">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Item
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3 tw-text-right">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Qty
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3 tw-text-center">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Unit
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3 tw-text-right">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Value (SAR)
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3 tw-text-center">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Priority
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3 tw-text-center">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Inventory Flag
                        </Typography>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedLinesRows.map((row) => (
                      <tr
                        key={row.id}
                        className="tw-border-b tw-border-blue-gray-50 last:tw-border-transparent"
                      >
                        <td className="tw-px-6 tw-py-4">
                          <div className="tw-flex tw-flex-col">
                            <Typography variant="small" color="blue-gray" className="!tw-font-semibold">
                              {row.poNo}
                            </Typography>
                            <Typography
                              variant="small"
                              className="!tw-font-normal !tw-text-blue-gray-400"
                            >
                              {row.vendorName}
                            </Typography>
                          </div>
                        </td>
                        <td className="tw-px-6 tw-py-4">
                          <div className="tw-flex tw-flex-col">
                            <Typography variant="small" color="blue-gray" className="!tw-font-semibold">
                              {row.itemName}
                            </Typography>
                            <Typography
                              variant="small"
                              className="!tw-font-normal !tw-text-blue-gray-400"
                            >
                              {row.materialCode ?? "—"}
                            </Typography>
                          </div>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-text-right">
                          <Typography
                            variant="small"
                            color="blue-gray"
                            className="!tw-font-semibold"
                          >
                            {qtyFormatter.format(parseNumeric(row.qty))}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-text-center">
                          <Typography
                            variant="small"
                            className="!tw-font-normal !tw-text-blue-gray-500"
                          >
                            {row.unit}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-text-right">
                          <Typography
                            variant="small"
                            color="blue-gray"
                            className="!tw-font-semibold"
                          >
                            {currencyFormatter.format(parseNumeric(row.lineTotal))}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-text-center">
                          <Chip
                            value={row.requestPriority}
                            color={priorityColorMap[row.requestPriority]}
                            variant="ghost"
                            className="tw-w-fit tw-uppercase"
                          />
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-text-center">
                          <Chip
                            value={inventoryStatusLabel[row.inventoryStatus]}
                            color={inventoryStatusColor[row.inventoryStatus]}
                            variant="ghost"
                            className="tw-w-fit tw-uppercase"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="tw-flex tw-min-h-[180px] tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-dashed tw-border-blue-gray-100 tw-bg-blue-gray-50/50">
                <Typography
                  variant="small"
                  className="!tw-font-normal !tw-text-blue-gray-400"
                >
                  All caught up—no pending lines at the moment.
                </Typography>
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Inventory
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Sortable, filterable, and exportable
          </Typography>
        </div>
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-6"
          >
            <div className="tw-flex tw-flex-col tw-gap-2">
              <Typography variant="h6" color="blue-gray">
                Inventory Records
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Connect to /api/inventory/list for live data
              </Typography>
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
              <div className="tw-flex tw-flex-col tw-gap-3 sm:tw:flex-row sm:tw-items-center sm:tw-gap-4">
                <Input
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  label="Search items…"
                  type="search"
                  icon={<MagnifyingGlassIcon className="tw-h-5 tw-w-5" />}
                  className="sm:tw-w-72"
                  crossOrigin="anonymous"
                />
                <Button
                  variant="outlined"
                  color="blue-gray"
                  size="sm"
                  className="tw-flex tw-items-center tw-gap-2"
                  disabled
                >
                  Quick Actions
                  <ChevronDownIcon className="tw-h-4 tw-w-4" />
                </Button>
              </div>
              <div className="tw-flex tw-flex-wrap tw-gap-2">
                {INVENTORY_QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setInventoryFilter(filter)}
                    aria-pressed={inventoryFilter === filter}
                    className="tw-inline-flex tw-rounded-full tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-blue-500"
                  >
                    <Chip
                      variant={inventoryFilter === filter ? "filled" : "ghost"}
                      color={inventoryFilter === filter ? "blue" : "blue-gray"}
                      value={filter}
                      className="tw-pointer-events-none tw-uppercase"
                    />
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody className="tw-space-y-6 tw-p-0">
            <div className="tw-overflow-x-auto">
              <table className="tw-w-full tw-min-w-[880px] tw-table-auto">
                <thead className="tw-bg-blue-gray-50/60">
                  <tr>
                    {INVENTORY_TABLE_COLUMNS.map((column) => (
                      <th key={column} className="tw-px-6 tw-py-3 tw-text-left">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          {column}
                        </Typography>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      className="tw-px-6 tw-py-10 tw-text-center"
                      colSpan={INVENTORY_TABLE_COLUMNS.length}
                    >
                      <Typography
                        variant="small"
                        className="!tw-font-normal !tw-text-blue-gray-400"
                      >
                        Inventory rows will appear once data is connected.
                      </Typography>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Recent Movements
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Inbound, outbound, and transfer records
          </Typography>
        </div>
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-6"
          >
            <div className="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
              <Input
                value={movementSearch}
                onChange={(event) => setMovementSearch(event.target.value)}
                label="Search movements"
                type="search"
                icon={<MagnifyingGlassIcon className="tw-h-5 tw-w-5" />}
                className="lg:tw-w-72"
                crossOrigin="anonymous"
              />
              <div className="tw-flex tw-flex-wrap tw-gap-2">
                {MOVEMENT_SEGMENTS.map((segment) => (
                  <Button
                    key={segment}
                    size="sm"
                    variant={movementSegment === segment ? "filled" : "text"}
                    color={movementSegment === segment ? "blue" : "blue-gray"}
                    className="tw-capitalize"
                    onClick={() => setMovementSegment(segment)}
                  >
                    {segment}
                  </Button>
                ))}
              </div>
            </div>
            <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-gap-4">
              <Select
                label="Store"
                variant="outlined"
                value={storeFilter || undefined}
                onChange={(value) => setStoreFilter(value ?? "")}
                disabled
                className="sm:tw-w-64"
              >
                <Option value="">All stores</Option>
              </Select>
              <Select
                label="Sort"
                variant="outlined"
                value={sortOrder}
                onChange={(value) =>
                  setSortOrder((value as "newest" | "oldest") ?? "newest")
                }
                className="sm:tw-w-64"
              >
                <Option value="newest">Newest → Oldest</Option>
                <Option value="oldest">Oldest → Newest</Option>
              </Select>
            </div>
          </CardHeader>
          <CardBody className="tw-space-y-6 tw-p-0">
            <div className="tw-overflow-x-auto">
              <table className="tw-w-full tw-min-w-[880px] tw-table-auto">
                <thead className="tw-bg-blue-gray-50/60">
                  <tr>
                    {MOVEMENTS_TABLE_COLUMNS.map((column) => (
                      <th key={column} className="tw-px-6 tw-py-3 tw-text-left">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          {column}
                        </Typography>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      className="tw-px-6 tw-py-10 tw-text-center"
                      colSpan={MOVEMENTS_TABLE_COLUMNS.length}
                    >
                      <Typography
                        variant="small"
                        className="!tw-font-normal !tw-text-blue-gray-400"
                      >
                        Movement history will populate after connecting /api/inventory/movements.
                      </Typography>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Inventory Details
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Explore all SKUs, values, and status
          </Typography>
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {inventoryDetailsCards.map((card) => (
            <BlackBoxKpiCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
            />
          ))}
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-12">
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Status Distribution
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Inventory across in, low, and out states
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(statusDistributionHasData, () => (
                <PieChart
                  height={320}
                  series={statusDistribution?.data ?? []}
                  labels={statusDistribution?.labels ?? []}
                  options={{ legend: { show: true } }}
                />
              ))}
            </CardBody>
          </Card>
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Value by Category
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Monetary spread per category
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(valueByCategoryHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Inventory Value",
                      data: valueByCategory?.data ?? [],
                    },
                  ]}
                  options={{
                    xaxis: { categories: valueByCategory?.labels ?? [] },
                    legend: { show: false },
                  }}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Critical Alerts
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Priority inventory requiring attention
          </Typography>
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {criticalAlertCards.map((card) => (
            <BlackBoxKpiCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
            />
          ))}
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-12">
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Critical Items by Category
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Focus areas across material classes
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(criticalByCategoryHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Critical Items",
                      data: criticalByCategory?.data ?? [],
                    },
                  ]}
                  options={{
                    xaxis: { categories: criticalByCategory?.labels ?? [] },
                    legend: { show: false },
                  }}
                />
              ))}
            </CardBody>
          </Card>
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Critical Items by Warehouse
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Monitor hotspots across facilities
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(criticalByWarehouseHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Critical Items",
                      data: criticalByWarehouse?.data ?? [],
                    },
                  ]}
                  options={{
                    xaxis: { categories: criticalByWarehouse?.labels ?? [] },
                    legend: { show: false },
                  }}
                />
              ))}
            </CardBody>
          </Card>
        </div>
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-1"
          >
            <Typography variant="h6" color="blue-gray">
              Top Critical Items
            </Typography>
            <Typography
              variant="small"
              className="!tw-font-normal !tw-text-blue-gray-500"
            >
              Link to /api/aggregates/warehouse/top-critical-items for live list
            </Typography>
          </CardHeader>
          <CardBody>
            <div className="tw-flex tw-min-h-[180px] tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-dashed tw-border-blue-gray-100 tw-bg-blue-gray-50/50">
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-400"
              >
                No critical items to display.
              </Typography>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="tw-mt-12 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Slow-Moving & Excess Stock
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Identify optimisation opportunities
          </Typography>
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {slowMovingCards.map((card) => (
            <BlackBoxKpiCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
            />
          ))}
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-12">
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Excess by Category
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Highlight categories above target levels
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(excessByCategoryHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Excess Stock",
                      data: excessByCategory?.data ?? [],
                    },
                  ]}
                  options={{
                    xaxis: { categories: excessByCategory?.labels ?? [] },
                    legend: { show: false },
                  }}
                />
              ))}
            </CardBody>
          </Card>
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Top Slow-Moving Items
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Monitor items with stagnating demand
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(topSlowItemsHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Slow Moving",
                      data: topSlowItems?.data ?? [],
                    },
                  ]}
                  options={{
                    xaxis: { categories: topSlowItems?.labels ?? [] },
                    legend: { show: false },
                  }}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="tw-mt-12 tw-mb-4 tw-space-y-6">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            Warehouse Utilization
          </Typography>
          <Typography
            variant="small"
            className="!tw-font-normal !tw-text-blue-gray-500"
          >
            Capacity and usage by warehouse
          </Typography>
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {utilizationCards.map((card) => (
            <BlackBoxKpiCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
            />
          ))}
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-12">
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Utilization Share
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Capacity split per warehouse
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(utilizationShareHasData, () => (
                <PieChart
                  height={320}
                  series={utilizationShare?.data ?? []}
                  labels={utilizationShare?.labels ?? []}
                  options={{ legend: { show: true } }}
                />
              ))}
            </CardBody>
          </Card>
          <Card className="tw-h-full tw-border tw-border-blue-gray-100 tw-shadow-sm xl:tw-col-span-6">
            <CardHeader
              floated={false}
              shadow={false}
              className="tw-flex tw-flex-col tw-gap-1"
            >
              <Typography variant="h6" color="blue-gray">
                Capacity vs Used
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                Compare available vs utilised space
              </Typography>
            </CardHeader>
            <CardBody className="tw-space-y-4">
              {renderChartContent(capacityVsUsedHasData, () => (
                <VerticalBarChart
                  height={320}
                  series={[
                    {
                      name: "Capacity",
                      data: capacityVsUsed?.capacity ?? [],
                    },
                    {
                      name: "Used",
                      data: capacityVsUsed?.used ?? [],
                    },
                  ]}
                  options={{
                    chart: { stacked: false },
                    xaxis: { categories: capacityVsUsed?.labels ?? [] },
                    legend: { show: true },
                  }}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      </section>
    </>
  );
}
