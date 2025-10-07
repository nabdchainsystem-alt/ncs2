"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  IconButton,
  Input,
  Option,
  Select,
  Tooltip,
  Typography,
} from "@/components/MaterialTailwind";
import WarehouseHero from "@/components/warehouse/WarehouseHero";
import WarehouseFlowChart from "@/components/warehouse/WarehouseFlowChart";
import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  ArrowDownTrayIcon,
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
import { useMaterials, useWarehouses } from "@/hooks/data";

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
  category: string | null;
  warehouseName: string | null;
  requestStatus?: string | null;
};

type CompletedLinesResponse = {
  count: number;
  rows: CompletedLineRow[];
};

type InventoryRecordRow = {
  id: string;
  category: string;
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  warehouse: string;
  value: number;
  receivedAt: string;
  minQty: number;
};

type InventoryRowDerived = InventoryRecordRow & {
  status: InventoryStatusValue;
  threshold: number;
  identifier: string;
};

const INVENTORY_STORAGE_KEY = "warehouse/inventory-records";
const DEFAULT_WAREHOUSE_FALLBACK = "Unassigned Warehouse";

const formatCategoryLabel = (raw: string | null | undefined): string => {
  if (!raw) {
    return "Uncategorized";
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return "Uncategorized";
  }

  const normalized = trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return normalized || "Uncategorized";
};

const sortInventoryRecords = (records: InventoryRecordRow[]) =>
  records
    .slice()
    .sort((a, b) =>
      a.category.localeCompare(b.category, undefined, { sensitivity: "base" }) ||
      a.itemCode.localeCompare(b.itemCode, undefined, { sensitivity: "base" }) ||
      a.description.localeCompare(b.description, undefined, { sensitivity: "base" })
    );

const normalizeStoredInventoryRecord = (
  value: unknown
): InventoryRecordRow | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id : null;
  const categoryRaw = typeof record.category === "string" ? record.category : "";
  const itemCode = typeof record.itemCode === "string" ? record.itemCode : null;
  const description = typeof record.description === "string" ? record.description : null;
  const quantity = Number(record.quantity);
  const unit = typeof record.unit === "string" ? record.unit : null;
  const warehouseRaw =
    typeof record.warehouse === "string"
      ? record.warehouse
      : typeof record.store === "string"
      ? (record.store as string)
      : null;
  const warehouse =
    warehouseRaw && typeof warehouseRaw === "string" && warehouseRaw.trim()
      ? warehouseRaw
      : DEFAULT_WAREHOUSE_FALLBACK;
  const valueSar = Number(record.value ?? record.lineTotal ?? 0);
  const receivedAt = typeof record.receivedAt === "string" ? record.receivedAt : null;
  const minQty = Number(record.minQty);

  if (
    !id ||
    !itemCode ||
    !description ||
    !Number.isFinite(quantity) ||
    !unit ||
    !receivedAt ||
    !Number.isFinite(minQty)
  ) {
    return null;
  }

  const normalizedWarehouse = warehouse.trim() || DEFAULT_WAREHOUSE_FALLBACK;
  return {
    id,
    category: formatCategoryLabel(categoryRaw),
    itemCode,
    description,
    quantity,
    unit,
    warehouse: normalizedWarehouse,
    value: Number.isFinite(valueSar) ? valueSar : 0,
    receivedAt,
    minQty,
  };
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

const inventoryStatusLabel: Record<InventoryStatusValue, string> = {
  NORMAL: "Normal",
  LOW: "Low Stock",
  OUT: "Out of Stock",
};
const inventoryStatusFlagMeta: Record<InventoryStatusValue, {
  label: string;
  icon: typeof CheckCircleIcon;
  textClass: string;
  chipClass: string;
}> = {
  NORMAL: {
    label: "In Stock",
    icon: CheckCircleIcon,
    textClass: "tw-text-emerald-600",
    chipClass: "tw-bg-emerald-50 tw-border tw-border-emerald-100",
  },
  LOW: {
    label: "Low Stock",
    icon: ExclamationTriangleIcon,
    textClass: "tw-text-amber-600",
    chipClass: "tw-bg-amber-50 tw-border tw-border-amber-200",
  },
  OUT: {
    label: "Out of Stock",
    icon: XCircleIcon,
    textClass: "tw-text-red-600",
    chipClass: "tw-bg-red-50 tw-border tw-border-red-200",
  },
};

const STATUS_DISTRIBUTION_COLORS = ["#2563eb", "#f59e0b", "#ef4444"];
const withAlpha = (hex: string, alphaHex: string) => `${hex}${alphaHex}`;

const parseNumeric = (value: string | number) => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type VerticalBarChartComponent =
  typeof import("@/widgets/charts/vertical-bar-chart").default;
const VerticalBarChart = dynamic(
  () => import("@/widgets/charts/vertical-bar-chart"),
  { ssr: false }
) as unknown as VerticalBarChartComponent;

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

const INVENTORY_TABLE_COLUMNS = [
  "PIC",
  "CATEGORY",
  "ITEM CODE",
  "ITEM DESCRIPTION",
  "QUANTITY",
  "UNIT",
  "WAREHOUSE",
  "VALUE (SAR)",
  "STOCK FLAG",
  "ACTIONS",
] as const;

const hasPositiveValues = (values: number[]) =>
  values.length > 0 && values.some((value) => value > 0);

export default function WarehousePage() {
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryQuickFilter>("All");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecordRow[]>([]);
  const [inventoryHydrated, setInventoryHydrated] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<CompletedLineRow | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState<string>("");
  const [receiveWarehouse, setReceiveWarehouse] = useState<string>(DEFAULT_WAREHOUSE_FALLBACK);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (!storedValue) {
        setInventoryHydrated(true);
        return;
      }

      const parsed = JSON.parse(storedValue);
      if (!Array.isArray(parsed)) {
        setInventoryHydrated(true);
        return;
      }

      const validRecords = parsed
        .map((record) => normalizeStoredInventoryRecord(record))
        .filter((record): record is InventoryRecordRow => Boolean(record));

      if (validRecords.length > 0) {
        setInventoryRecords(sortInventoryRecords(validRecords));
      }
    } catch (error) {
      console.error("warehouse inventory storage parse", error);
    } finally {
      setInventoryHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!inventoryHydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        INVENTORY_STORAGE_KEY,
        JSON.stringify(inventoryRecords)
      );
    } catch (error) {
      console.error("warehouse inventory storage persist", error);
    }
  }, [inventoryHydrated, inventoryRecords]);

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

  const { rows: materialsRows } = useMaterials({ page: 1, pageSize: 1000 });
  const materialsByCode = useMemo(() => {
    const map = new Map<string, { code: string; category: string; minQty: number; unit: string }>();
    materialsRows.forEach((material) => {
      if (!material.code) return;
      const key = material.code.trim().toUpperCase();
      map.set(key, {
        code: material.code,
        category: material.category,
        minQty: Number(material.minQty ?? 0),
        unit: material.unit,
      });
    });
    return map;
  }, [materialsRows]);

  const { rows: warehouseRows } = useWarehouses({ page: 1, pageSize: 1000 });
  const warehouseOptions = useMemo(() => {
    const names = warehouseRows
      .map((warehouse) => warehouse.name?.trim() || warehouse.code?.trim() || null)
      .filter((value): value is string => Boolean(value && value.length > 0));
    return Array.from(new Set(names));
  }, [warehouseRows]);
  const fallbackWarehouseOption = warehouseOptions[0] ?? DEFAULT_WAREHOUSE_FALLBACK;

  useEffect(() => {
    if (
      !receiveWarehouse ||
      (warehouseOptions.length > 0 && !warehouseOptions.includes(receiveWarehouse))
    ) {
      setReceiveWarehouse(fallbackWarehouseOption);
    }
  }, [receiveWarehouse, warehouseOptions, fallbackWarehouseOption]);

  const pendingLinesCount = completedLinesData?.count ?? 0;
  const completedLinesRows = completedLinesData?.rows ?? [];
  const hasCompletedLines = completedLinesRows.length > 0;
  const pendingLinesDisplay = completedLinesLoading
    ? "…"
    : numberFormatter.format(pendingLinesCount);

  const defaultLowStockThreshold = 10;

  const derivedInventoryRecords = useMemo<InventoryRowDerived[]>(
    () =>
      inventoryRecords.map((record) => {
        const threshold = record.minQty > 0 ? record.minQty : defaultLowStockThreshold;
        let status: InventoryStatusValue = "NORMAL";
        if (record.quantity <= 0) {
          status = "OUT";
        } else if (record.quantity <= threshold) {
          status = "LOW";
        }
        const identifier = (record.itemCode || record.description || "").trim().toUpperCase();
        return { ...record, status, threshold, identifier };
      }),
    [inventoryRecords, defaultLowStockThreshold]
  );

  const filteredInventoryRecords = useMemo<InventoryRowDerived[]>(() => {
    const normalizedSearch = inventorySearch.trim().toLowerCase();

    return derivedInventoryRecords.filter((record) => {
      const matchesSearch = normalizedSearch
        ? record.itemCode.toLowerCase().includes(normalizedSearch) ||
          record.description.toLowerCase().includes(normalizedSearch) ||
          record.category.toLowerCase().includes(normalizedSearch) ||
          record.warehouse.toLowerCase().includes(normalizedSearch)
        : true;

      let matchesFilter = true;

      switch (inventoryFilter) {
        case "In Stock":
          matchesFilter = record.status === "NORMAL";
          break;
        case "Low Stock":
          matchesFilter = record.status === "LOW";
          break;
        case "Out of Stock":
          matchesFilter = record.status === "OUT";
          break;
        case "All":
          matchesFilter = true;
          break;
        default:
          matchesFilter = record.category
            .toLowerCase()
            .includes(inventoryFilter.toLowerCase());
      }

      return matchesSearch && matchesFilter;
    });
  }, [derivedInventoryRecords, inventoryFilter, inventorySearch]);

  const inventoryStats = useMemo(() => {
    if (derivedInventoryRecords.length === 0) {
      return {
        totalSkus: 0,
        totalValue: 0,
        averageUnitCost: 0,
        inStockPct: 0,
        statusCounts: { NORMAL: 0, LOW: 0, OUT: 0 } as Record<InventoryStatusValue, number>,
        statusDistribution: null as { labels: string[]; data: number[] } | null,
        valueByCategory: null as { labels: string[]; data: number[] } | null,
        totalQty: 0,
      };
    }

    const skuIdentifiers = new Set<string>();
    const healthySkuIdentifiers = new Set<string>();
    let totalValue = 0;
    let totalQty = 0;
    const statusCounts: Record<InventoryStatusValue, number> = {
      NORMAL: 0,
      LOW: 0,
      OUT: 0,
    };
    const categoryTotals = new Map<string, number>();

    derivedInventoryRecords.forEach((record) => {
      skuIdentifiers.add(record.identifier || record.id);
      const safeValue = Number.isFinite(record.value) ? record.value : 0;
      const safeQuantity = Number.isFinite(record.quantity) ? record.quantity : 0;
      totalValue += safeValue;
      if (safeQuantity > 0) {
        totalQty += safeQuantity;
      }
      statusCounts[record.status] += 1;
      if (record.status === "NORMAL") {
        healthySkuIdentifiers.add(record.identifier || record.id);
      }
      categoryTotals.set(
        record.category,
        (categoryTotals.get(record.category) ?? 0) + safeValue
      );
    });

    const averageUnitCost = totalQty > 0 ? totalValue / totalQty : 0;
    const totalSkus = skuIdentifiers.size;
    const inStockPct = totalSkus > 0 ? (healthySkuIdentifiers.size / totalSkus) * 100 : 0;

    const statusDistribution =
      statusCounts.NORMAL + statusCounts.LOW + statusCounts.OUT > 0
        ? {
            labels: ["In Stock", "Low Stock", "Out of Stock"],
            data: [statusCounts.NORMAL, statusCounts.LOW, statusCounts.OUT],
          }
        : null;

    const categoryEntries = Array.from(categoryTotals.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const limitedCategoryEntries = categoryEntries.slice(0, 10);
    const valueByCategory =
      limitedCategoryEntries.length > 0
        ? {
            labels: limitedCategoryEntries.map(([label]) => label),
            data: limitedCategoryEntries.map(([, value]) => value),
          }
        : null;

    return {
      totalSkus,
      totalValue,
      averageUnitCost,
      inStockPct,
      statusCounts,
      statusDistribution,
      valueByCategory,
      totalQty,
    };
  }, [derivedInventoryRecords]);

  const lowVsOut = useMemo(() => {
    const categoryTotals = new Map<string, { low: number; out: number }>();

    derivedInventoryRecords.forEach((record) => {
      if (record.status !== "LOW" && record.status !== "OUT") {
        return;
      }
      const entry = categoryTotals.get(record.category) ?? { low: 0, out: 0 };
      if (record.status === "LOW") {
        entry.low += 1;
      } else {
        entry.out += 1;
      }
      categoryTotals.set(record.category, entry);
    });

    const ordered = Array.from(categoryTotals.entries()).sort((a, b) => {
      const aTotal = a[1].low + a[1].out;
      const bTotal = b[1].low + b[1].out;
      return bTotal - aTotal;
    });

    if (ordered.length === 0) {
      return null;
    }

    return {
      labels: ordered.map(([label]) => label),
      low: ordered.map(([, value]) => value.low),
      out: ordered.map(([, value]) => value.out),
    };
  }, [derivedInventoryRecords]);

  const itemsPerWarehouse = useMemo(() => {
    const warehouseCounts = new Map<string, number>();

    derivedInventoryRecords.forEach((record) => {
      warehouseCounts.set(
        record.warehouse,
        (warehouseCounts.get(record.warehouse) ?? 0) + 1
      );
    });

    const ordered = Array.from(warehouseCounts.entries()).sort((a, b) => b[1] - a[1]);

    if (ordered.length === 0) {
      return null;
    }

    return {
      labels: ordered.map(([label]) => label),
      data: ordered.map(([, value]) => value),
    };
  }, [derivedInventoryRecords]);

  const statusDistribution = inventoryStats.statusDistribution;
  const valueByCategory = inventoryStats.valueByCategory;

  const statusSummary = useMemo(() => {
    const entries: Array<{ label: string; value: number; color: string }> = [
      { label: "In Stock", value: inventoryStats.statusCounts.NORMAL, color: STATUS_DISTRIBUTION_COLORS[0] },
      { label: "Low Stock", value: inventoryStats.statusCounts.LOW, color: STATUS_DISTRIBUTION_COLORS[1] },
      { label: "Out of Stock", value: inventoryStats.statusCounts.OUT, color: STATUS_DISTRIBUTION_COLORS[2] },
    ];
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    return { entries, total };
  }, [inventoryStats.statusCounts]);

  const lowVsOutSummary = useMemo(() => {
    if (!lowVsOut) {
      return null;
    }
    const totalLow = lowVsOut.low.reduce((sum, value) => sum + value, 0);
    const totalOut = lowVsOut.out.reduce((sum, value) => sum + value, 0);
    const grandTotal = totalLow + totalOut;
    return {
      totalLow,
      totalOut,
      grandTotal,
    };
  }, [lowVsOut]);

  const itemsPerWarehouseSummary = useMemo(() => {
    if (!itemsPerWarehouse) {
      return null;
    }
    const total = itemsPerWarehouse.data.reduce((sum, value) => sum + value, 0);
    const top = itemsPerWarehouse.labels[0]
      ? {
          label: itemsPerWarehouse.labels[0],
          value: itemsPerWarehouse.data[0],
          share:
            total > 0 ? Math.round((itemsPerWarehouse.data[0] / total) * 100) : 0,
        }
      : null;
    return { total, top };
  }, [itemsPerWarehouse]);

  const valueByCategorySummary = useMemo(() => {
    if (!valueByCategory) {
      return null;
    }
    const total = valueByCategory.data.reduce((sum, value) => sum + value, 0);
    const top = valueByCategory.labels[0]
      ? {
          label: valueByCategory.labels[0],
          value: valueByCategory.data[0],
          share:
            total > 0 ? Math.round((valueByCategory.data[0] / total) * 100) : 0,
        }
      : null;
    return { total, top };
  }, [valueByCategory]);

  const topStatusEntry = useMemo(() => {
    if (!statusSummary.entries.length || statusSummary.total === 0) {
      return null;
    }
    return statusSummary.entries.reduce((best, entry) =>
      entry.value > best.value ? entry : best
    );
  }, [statusSummary]);

  const lowVsOutHighlight = useMemo(() => {
    if (!lowVsOut || !lowVsOutSummary || lowVsOutSummary.grandTotal === 0) {
      return null;
    }
    let bestIndex = 0;
    let bestTotal = 0;
    lowVsOut.labels.forEach((label, index) => {
      const total = (lowVsOut.low[index] ?? 0) + (lowVsOut.out[index] ?? 0);
      if (total > bestTotal) {
        bestTotal = total;
        bestIndex = index;
      }
    });
    if (bestTotal === 0) {
      return null;
    }
    const low = lowVsOut.low[bestIndex] ?? 0;
    const out = lowVsOut.out[bestIndex] ?? 0;
    return {
      label: lowVsOut.labels[bestIndex],
      low,
      out,
      total: bestTotal,
      share: Math.round((bestTotal / lowVsOutSummary.grandTotal) * 100),
    };
  }, [lowVsOut, lowVsOutSummary]);


  const handleOpenReceive = (row: CompletedLineRow) => {
    setReceiveTarget(row);
    setReceiveQty(row.qty);
    setReceiveWarehouse(row.warehouseName ?? fallbackWarehouseOption);
    setReceiveError(null);
    setReceiveDialogOpen(true);
  };

  const handleCloseReceive = () => {
    setReceiveDialogOpen(false);
    setReceiveTarget(null);
    setReceiveError(null);
  };

  const handleReceiveSubmit = () => {
    if (!receiveTarget) {
      return;
    }

    const quantity = Number(receiveQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setReceiveError("Enter a valid quantity greater than zero.");
      return;
    }

    const warehouse = receiveWarehouse.trim() || fallbackWarehouseOption;
    const materialKey = (receiveTarget.materialCode ?? "").trim().toUpperCase();
    const materialInfo = materialKey ? materialsByCode.get(materialKey) : undefined;

    const category = formatCategoryLabel(
      materialInfo?.category ?? receiveTarget.category ?? "Uncategorized"
    );
    const rawCode =
      materialInfo?.code?.trim() ||
      receiveTarget.materialCode?.trim() ||
      receiveTarget.itemName?.trim() ||
      "SKU";
    const displayCode = rawCode;
    const identifier = displayCode.toUpperCase();
    const minQty = materialInfo?.minQty ?? 0;
    const resolvedMinQty = minQty > 0 ? minQty : defaultLowStockThreshold;
    const unit = materialInfo?.unit ?? receiveTarget.unit;
    const unitPriceNumeric = parseNumeric(receiveTarget.unitPrice);
    const value = unitPriceNumeric * quantity;
    const recordKey = `${identifier}::${warehouse.toUpperCase()}`;

    setInventoryRecords((prev) => {
      let updated = false;
      const next = prev.map((existing) => {
        const existingIdentifier = (
          existing.itemCode?.trim() || existing.description?.trim() || existing.id
        ).toUpperCase();
        const existingKey = `${existingIdentifier}::${existing.warehouse.toUpperCase()}`;

        if (existingKey === recordKey) {
          updated = true;
          const mergedQuantity = existing.quantity + quantity;
          const mergedValue = existing.value + value;
          const mergedMinQty = minQty > 0 ? minQty : existing.minQty;

          return {
            ...existing,
            category,
            itemCode: displayCode,
            description: receiveTarget.itemName,
            quantity: mergedQuantity,
            unit,
            warehouse,
            value: mergedValue,
            receivedAt: new Date().toISOString(),
            minQty: mergedMinQty > 0 ? mergedMinQty : defaultLowStockThreshold,
          } satisfies InventoryRecordRow;
        }

        return existing;
      });

      if (updated) {
        return sortInventoryRecords(next);
      }

      const record: InventoryRecordRow = {
        id: crypto.randomUUID(),
        category,
        itemCode: displayCode,
        description: receiveTarget.itemName,
        quantity,
        unit,
        warehouse,
        value,
        receivedAt: new Date().toISOString(),
        minQty: resolvedMinQty,
      };

      return sortInventoryRecords([record, ...next]);
    });
    handleCloseReceive();
  };

  const handleRemoveInventoryRecord = (id: string) => {
    setInventoryRecords((prev) => prev.filter((record) => record.id !== id));
  };

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

  const utilizationShareSummary = useMemo(() => {
    if (!utilizationShare || utilizationShare.data.length === 0) {
      return null;
    }
    const total = utilizationShare.data.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      return null;
    }
    let topIndex = 0;
    for (let i = 1; i < utilizationShare.data.length; i += 1) {
      if (utilizationShare.data[i] > utilizationShare.data[topIndex]) {
        topIndex = i;
      }
    }
    return {
      total,
      label: utilizationShare.labels[topIndex] ?? "—",
      value: utilizationShare.data[topIndex] ?? 0,
      share: Math.round(((utilizationShare.data[topIndex] ?? 0) / total) * 100),
    };
  }, [utilizationShare]);

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

  const inventoryDetailsCards = useMemo(
    () => [
      {
        title: "TOTAL SKUS",
        icon: <ClipboardDocumentListIcon className="tw-h-6 tw-w-6" />,
        subtitle: "Unique materials tracked",
        value: numberFormatter.format(inventoryStats.totalSkus),
      },
      {
        title: "INVENTORY VALUE (SAR)",
        icon: <BanknotesIcon className="tw-h-6 tw-w-6" />,
        subtitle: "Gross inventory value",
        value: currencyFormatter.format(inventoryStats.totalValue),
      },
      {
        title: "AVERAGE UNIT COST",
        icon: <ChartBarIcon className="tw-h-6 tw-w-6" />,
        subtitle: "Weighted across SKUs",
        value: currencyFormatter.format(
          Number.isFinite(inventoryStats.averageUnitCost)
            ? inventoryStats.averageUnitCost
            : 0
        ),
      },
      {
        title: "IN-STOCK %",
        icon: <CheckCircleIcon className="tw-h-6 tw-w-6" />,
        subtitle: "Availability across network",
        value: `${Math.round(inventoryStats.inStockPct)}%`,
      },
    ],
    [inventoryStats]
  );

  const criticalAlertCards = [
    {
      title: "CRITICAL ITEMS",
      icon: <ExclamationTriangleIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Flagged for action",
      value: numberFormatter.format(
        inventoryStats.statusCounts.LOW + inventoryStats.statusCounts.OUT
      ),
    },
    {
      title: "CRITICAL OUT OF STOCK",
      icon: <XCircleIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Zero balance",
      value: numberFormatter.format(inventoryStats.statusCounts.OUT),
    },
    {
      title: "CRITICAL LOW STOCK",
      icon: <BoltIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Below reorder level",
      value: numberFormatter.format(inventoryStats.statusCounts.LOW),
    },
    {
      title: "LINKED REQUESTS",
      icon: <ClipboardDocumentCheckIcon className="tw-h-6 tw-w-6" />,
      subtitle: "Pending approvals",
      value: numberFormatter.format(pendingLinesCount),
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
    <div className="tw-mt-8 tw-mb-4 tw-space-y-6">
      <section>
        <WarehouseHero />
      </section>

      <section className="tw-space-y-6">
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
        <WarehouseFlowChart />
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
                <div className="tw-space-y-4">
                  <VerticalBarChart
                    height={260}
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
                  {lowVsOutHighlight && lowVsOutSummary ? (
                    <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        Top critical category
                      </Typography>
                      <div className="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                        <Typography variant="h6" color="blue-gray">
                          {lowVsOutHighlight.label}
                        </Typography>
                        <span
                          className="tw-inline-flex tw-items-center tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase"
                          style={{
                            backgroundColor: withAlpha("#f97316", "26"),
                            color: "#f97316",
                          }}
                        >
                          {`${lowVsOutHighlight.share}% of alerts`}
                        </span>
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          {numberFormatter.format(lowVsOutHighlight.low)} low • {numberFormatter.format(lowVsOutHighlight.out)} out
                        </Typography>
                      </div>
                      <Typography variant="small" className="!tw-mt-2 !tw-text-blue-gray-400">
                        Total critical items: {numberFormatter.format(lowVsOutSummary.grandTotal)}
                      </Typography>
                    </div>
                  ) : null}
                </div>
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
                <div className="tw-space-y-4">
                  <VerticalBarChart
                    height={260}
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
                  {itemsPerWarehouseSummary?.top ? (
                    <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4 tw-space-y-2">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        Top warehouse by inventory lines
                      </Typography>
                      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                        <Typography variant="h6" color="blue-gray">
                          {itemsPerWarehouseSummary.top.label}
                        </Typography>
                        <span
                          className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-blue-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-blue-700"
                        >
                          {`${itemsPerWarehouseSummary.top.share}% of items`}
                        </span>
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          {numberFormatter.format(itemsPerWarehouseSummary.top.value)} items
                        </Typography>
                      </div>
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                        Total items tracked: {numberFormatter.format(itemsPerWarehouseSummary.total)} across {itemsPerWarehouse?.labels.length ?? 0} warehouses
                      </Typography>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="tw-space-y-6">
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-1"
          >
            <Typography variant="h6" color="blue-gray">
              Completed Orders Transfer
            </Typography>
            <Typography
              variant="small"
              className="!tw-font-normal !tw-text-blue-gray-500"
            >
              Review completed purchase order lines before they hit inventory
            </Typography>
          </CardHeader>
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
              <table className="tw-w-full tw-min-w-[720px] tw-table-auto tw-text-center">
                <thead className="tw-bg-blue-gray-50/60">
                  <tr>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          PO NO
                        </Typography>
                      </th>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Item Code
                        </Typography>
                      </th>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                      >
                        Item Name
                      </Typography>
                    </th>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                      >
                        Warehouse
                      </Typography>
                    </th>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                      >
                        Qty
                      </Typography>
                    </th>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Unit
                        </Typography>
                      </th>
                    <th className="tw-px-6 tw-py-3">
                      <Typography
                        variant="small"
                        color="blue-gray"
                        className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Value (SAR)
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Inventory Flag
                        </Typography>
                      </th>
                      <th className="tw-px-6 tw-py-3">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                        >
                          Actions
                        </Typography>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedLinesRows.map((row) => (
                      <tr
                      key={row.id}
                      className="tw-border-b tw-border-blue-gray-50 tw-bg-white last:tw-border-transparent hover:tw-bg-blue-gray-50/60"
                    >
                      <td className="tw-px-6 tw-py-4 tw-align-middle">
                        <Typography variant="small" color="blue-gray" className="!tw-font-semibold">
                          {row.poNo}
                        </Typography>
                        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                          {row.vendorName}
                        </Typography>
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle tw-text-blue-gray-600">
                        {row.materialCode ?? "—"}
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-700">
                          {row.itemName ?? "—"}
                        </Typography>
                        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                          {row.requestStatus ?? "Status TBD"}
                        </Typography>
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle">
                        <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                          {row.warehouseName ?? "—"}
                        </Typography>
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle tw-text-blue-gray-700">
                        {qtyFormatter.format(parseNumeric(row.qty))}
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle tw-text-blue-gray-500">
                        {row.unit}
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle tw-text-blue-gray-700">
                        {currencyFormatter.format(parseNumeric(row.lineTotal))}
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle">
                        <span className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-blue-gray-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-blue-gray-700">
                          {inventoryStatusLabel[row.inventoryStatus]}
                        </span>
                      </td>
                      <td className="tw-px-6 tw-py-4 tw-align-middle">
                        <Tooltip content="Receive to inventory">
                          <span>
                            <IconButton
                              variant="text"
                              color="blue"
                              onClick={() => handleOpenReceive(row)}
                            >
                              <ArrowDownTrayIcon className="tw-h-5 tw-w-5" />
                            </IconButton>
                          </span>
                        </Tooltip>
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

      <section className="tw-space-y-6">
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-6"
          >
            <div className="tw-flex tw-flex-col tw-gap-2">
              <Typography variant="h6" color="blue-gray">
                Inventory
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
              <table className="tw-w-full tw-min-w-[880px] tw-table-auto tw-text-center">
                <thead className="tw-bg-blue-gray-50/60">
                  <tr>
                    {INVENTORY_TABLE_COLUMNS.map((column) => (
                      <th key={column} className="tw-px-6 tw-py-3">
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
                  {filteredInventoryRecords.length === 0 ? (
                    <tr>
                      <td
                        className="tw-px-6 tw-py-10 tw-text-center"
                        colSpan={INVENTORY_TABLE_COLUMNS.length}
                      >
                        <Typography
                          variant="small"
                          className="!tw-font-normal !tw-text-blue-gray-400"
                        >
                          {inventoryRecords.length === 0
                            ? "Inventory rows will appear after receiving items."
                            : "No records match the current filters."}
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    filteredInventoryRecords.map((record) => {
                      const statusMeta = inventoryStatusFlagMeta[record.status];
                      const StatusIcon = statusMeta.icon;

                      return (
                      <tr
                        key={record.id}
                        className="tw-border-b tw-border-blue-gray-50 tw-bg-white last:tw-border-transparent hover:tw-bg-blue-gray-50/60"
                      >
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <div className="tw-grid tw-h-10 tw-w-10 tw-place-items-center tw-rounded-full tw-bg-blue-50 tw-text-blue-600">
                            {record.category.charAt(0).toUpperCase()}
                          </div>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <span className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-blue-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-blue-700">
                            {record.category}
                          </span>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle tw-text-blue-gray-700">
                          <Typography variant="small" className="!tw-font-semibold">
                            {record.itemCode}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                            {record.description}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-700">
                            {qtyFormatter.format(record.quantity)}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <span className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-blue-gray-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-blue-gray-700">
                            {record.unit}
                          </span>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {record.warehouse}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle tw-text-blue-gray-700">
                          {currencyFormatter.format(record.value)}
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <div
                            className={`tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold ${statusMeta.chipClass}`}
                          >
                            <StatusIcon className={`tw-h-4 tw-w-4 ${statusMeta.textClass}`} />
                            <span className={statusMeta.textClass}>{statusMeta.label}</span>
                          </div>
                          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                            Min {qtyFormatter.format(record.threshold)}
                          </Typography>
                        </td>
                        <td className="tw-px-6 tw-py-4 tw-align-middle">
                          <Tooltip content="Remove record">
                            <span>
                              <IconButton
                                variant="text"
                                color="blue-gray"
                                onClick={() => handleRemoveInventoryRecord(record.id)}
                              >
                                <XCircleIcon className="tw-h-5 tw-w-5" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="tw-space-y-6">
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {inventoryDetailsCards.map((card) => (
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
                <div className="tw-space-y-4">
                  <VerticalBarChart
                    height={260}
                    series={[
                      {
                        name: "SKUs",
                        data: statusDistribution?.data ?? [],
                      },
                    ]}
                    options={{
                      colors: STATUS_DISTRIBUTION_COLORS,
                      xaxis: { categories: statusDistribution?.labels ?? [] },
                      legend: { show: false },
                    }}
                  />
                  {topStatusEntry ? (
                    <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        Dominant status
                      </Typography>
                      <div className="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                        <Typography variant="h6" color="blue-gray">
                          {topStatusEntry.label}
                        </Typography>
                        <span
                          className="tw-inline-flex tw-items-center tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase"
                          style={{
                            backgroundColor: withAlpha(topStatusEntry.color, "26"),
                            color: topStatusEntry.color,
                          }}
                        >
                          {statusSummary.total
                            ? `${Math.round((topStatusEntry.value / statusSummary.total) * 100)}% of SKUs`
                            : ""}
                        </span>
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          {numberFormatter.format(topStatusEntry.value)} items
                        </Typography>
                      </div>
                      <Typography variant="small" className="!tw-mt-2 !tw-text-blue-gray-400">
                        Total tracked statuses: {numberFormatter.format(statusSummary.total)}
                      </Typography>
                    </div>
                  ) : null}
                </div>
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
                <div className="tw-space-y-4">
                  <VerticalBarChart
                    height={260}
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
                  {valueByCategorySummary?.top ? (
                    <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        Top category by value
                      </Typography>
                      <div className="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                        <Typography variant="h6" color="blue-gray">
                          {valueByCategorySummary.top.label}
                        </Typography>
                        <span className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-blue-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-blue-700">
                          {`${valueByCategorySummary.top.share}% of value`}
                        </span>
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          {currencyFormatter.format(valueByCategorySummary.top.value)}
                        </Typography>
                      </div>
                      <Typography variant="small" className="!tw-mt-2 !tw-text-blue-gray-400">
                        Total value (top 10): {currencyFormatter.format(valueByCategorySummary.total)}
                      </Typography>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="tw-space-y-6">
        <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          {criticalAlertCards.map((card) => (
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

      <section className="tw-space-y-6">
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

      <section className="tw-space-y-6">
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
                <div className="tw-space-y-4">
                  <VerticalBarChart
                    height={260}
                    series={[
                      {
                        name: "Capacity",
                        data: utilizationShare?.data ?? [],
                      },
                    ]}
                    options={{
                      xaxis: { categories: utilizationShare?.labels ?? [] },
                      legend: { show: false },
                    }}
                  />
                  {utilizationShareSummary ? (
                    <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        Highest utilised warehouse
                      </Typography>
                      <div className="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                        <Typography variant="h6" color="blue-gray">
                          {utilizationShareSummary.label ?? "—"}
                        </Typography>
                        <span className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-blue-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-blue-700">
                          {`${utilizationShareSummary.share}% of capacity`}
                        </span>
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          {numberFormatter.format(utilizationShareSummary.value)} units
                        </Typography>
                      </div>
                      <Typography variant="small" className="!tw-mt-2 !tw-text-blue-gray-400">
                        Total tracked capacity share: {numberFormatter.format(utilizationShareSummary.total)}
                      </Typography>
                    </div>
                  ) : null}
                </div>
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

      <Dialog open={receiveDialogOpen} handler={handleCloseReceive} size="sm">
        <DialogHeader>Receive to Inventory</DialogHeader>
        <DialogBody className="tw-space-y-4">
          {receiveTarget ? (
            <div className="tw-space-y-4">
              <div className="tw-flex tw-flex-col tw-gap-1">
                <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                  Item
                </Typography>
                <Typography variant="h6" className="!tw-font-semibold !tw-text-blue-gray-900">
                  {receiveTarget.itemName}
                </Typography>
                <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                  PO {receiveTarget.poNo} • Vendor {receiveTarget.vendorName}
                </Typography>
              </div>
              <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-2">
                <div>
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                    Category
                  </Typography>
                  <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-700">
                    {receiveTarget.category ?? "Uncategorized"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                    Item Code
                  </Typography>
                  <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-700">
                    {receiveTarget.materialCode ?? "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                    Ordered Qty
                  </Typography>
                  <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-700">
                    {qtyFormatter.format(parseNumeric(receiveTarget.qty))} {receiveTarget.unit}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                    Priority
                  </Typography>
                  <Chip
                    value={receiveTarget.requestPriority}
                    color={priorityColorMap[receiveTarget.requestPriority]}
                    variant="ghost"
                    className="tw-w-fit tw-uppercase"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {receiveError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {receiveError}
            </Typography>
          ) : null}

          <Input
            label="Actual quantity received"
            type="number"
            value={receiveQty}
            onChange={(event) => setReceiveQty(event.target.value)}
            crossOrigin="anonymous"
            min="0"
            required
          />

          <Select
            label="Warehouse"
            value={receiveWarehouse}
            onChange={(value) => setReceiveWarehouse(value ?? fallbackWarehouseOption)}
          >
            {(warehouseOptions.length > 0
              ? warehouseOptions
              : [fallbackWarehouseOption]
            ).map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        </DialogBody>
        <DialogFooter className="tw-space-x-2">
          <Button variant="text" color="gray" onClick={handleCloseReceive}>
            Cancel
          </Button>
          <Button color="blue" onClick={handleReceiveSubmit} disabled={!receiveTarget}>
            Receive
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
