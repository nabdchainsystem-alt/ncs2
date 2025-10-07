"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
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
import PageSizeSelect from "@/components/common/PageSizeSelect";
import {
  formatSAR,
  usePurchaseOrder,
  usePurchaseOrders,
  type PoStatus,
} from "@/hooks/orders/usePurchaseOrders";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  EyeIcon,
  InboxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { Check, Pause, X } from "lucide-react";

const STATUS_PILL_CLASSES: Record<PoStatus, string> = {
  OPEN: "tw-bg-blue-50 tw-text-blue-600",
  PARTIAL: "tw-bg-amber-50 tw-text-amber-600",
  RECEIVED: "tw-bg-green-50 tw-text-green-600",
  CLOSED: "tw-bg-emerald-100 tw-text-emerald-800",
  CANCELLED: "tw-bg-red-50 tw-text-red-600",
};

const STATUS_LABELS: PoStatus[] = ["OPEN", "PARTIAL", "RECEIVED", "CLOSED", "CANCELLED"];

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"] as const;
type PriorityValue = (typeof PRIORITY_OPTIONS)[number];

const PRIORITY_PILL_CLASSES: Record<PriorityValue, string> = {
  Low: "tw-bg-blue-gray-100 tw-text-blue-gray-700",
  Normal: "tw-bg-blue-50 tw-text-blue-600",
  High: "tw-bg-amber-50 tw-text-amber-600",
  Urgent: "tw-bg-red-50 tw-text-red-600",
};

type ApprovalState = "APPROVED" | "REJECTED" | "HOLD";

type SortField =
  | "poNo"
  | "primaryItemCode"
  | "primaryItemName"
  | "vendorName"
  | "createdAt"
  | "priority"
  | "status"
  | "subtotal"
  | "vatAmount"
  | "total";

type ColumnConfig = {
  key: string;
  label: string;
  sortField?: SortField;
  headerClass: string;
  cellClass: string;
};

const TABLE_COLUMNS: ColumnConfig[] = [
  {
    key: "poNo",
    label: "PO NO",
    sortField: "poNo",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-left tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-left",
  },
  {
    key: "primaryItemCode",
    label: "ITEM CODE",
    sortField: "primaryItemCode",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-left tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-left",
  },
  {
    key: "primaryItemName",
    label: "ITEM NAME",
    sortField: "primaryItemName",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-left tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-left",
  },
  {
    key: "vendorName",
    label: "VENDOR",
    sortField: "vendorName",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-left tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-left",
  },
  {
    key: "department",
    label: "DEPARTMENT",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-left tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-left",
  },
  {
    key: "createdAt",
    label: "CREATED",
    sortField: "createdAt",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-right tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-right",
  },
  {
    key: "priority",
    label: "PRIORITY",
    sortField: "priority",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-center tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-center",
  },
  {
    key: "status",
    label: "STATUS",
    sortField: "status",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-center tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-center",
  },
  {
    key: "subtotal",
    label: "SUBTOTAL",
    sortField: "subtotal",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-right tw-text-slate-600 tw-whitespace-nowrap hidden xl:table-cell",
    cellClass: "tw-text-right hidden xl:table-cell",
  },
  {
    key: "vatAmount",
    label: "VAT",
    sortField: "vatAmount",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-right tw-text-slate-600 tw-whitespace-nowrap hidden 2xl:table-cell",
    cellClass: "tw-text-right hidden 2xl:table-cell",
  },
  {
    key: "total",
    label: "TOTAL",
    sortField: "total",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-right tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-right",
  },
  {
    key: "approvals",
    label: "APPROVALS",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-center tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-center",
  },
  {
    key: "actions",
    label: "ACTIONS",
    headerClass: "tw-px-3 tw-py-3.5 tw-text-center tw-text-slate-600 tw-whitespace-nowrap",
    cellClass: "tw-text-center",
  },
];

type ColumnKey = (typeof TABLE_COLUMNS)[number]["key"];

const COLUMN_CELL_CLASS = TABLE_COLUMNS.reduce<Record<ColumnKey, string>>((acc, column) => {
  acc[column.key as ColumnKey] = column.cellClass;
  return acc;
}, {} as Record<ColumnKey, string>);

const BASE_CELL_CLASS = "tw-px-3 tw-py-2.5 tw-align-middle tw-whitespace-nowrap";

type PurchaseOrderParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  sort?: string;
};

type ReceiveTarget = { id: string; poNo: string };
type ReceiveDetail = { items: Array<any>; [key: string]: unknown };
type ReceiveFormState = { qty: string; date: string };

export default function AllPurchaseOrdersTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewId, setViewId] = useState<string | null>(null);
  const [updateTarget, setUpdateTarget] = useState<{ id: string; nextStatus: PoStatus } | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ReceiveTarget | null>(null);
  const [receiveDetail, setReceiveDetail] = useState<ReceiveDetail | null>(null);
  const [receiveForm, setReceiveForm] = useState<ReceiveFormState>({
    qty: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [receiveDialogError, setReceiveDialogError] = useState<string | null>(null);
  const [isReceiveSubmitting, setIsReceiveSubmitting] = useState(false);
  const [isReceiveDetailLoading, setIsReceiveDetailLoading] = useState(false);
  const [isReceiveDetailError, setIsReceiveDetailError] = useState(false);
  const [approvalLocal, setApprovalLocal] = useState<Record<string, ApprovalState | undefined>>({});

  useEffect(() => {
    if (!receiveOpen) {
      return;
    }
    setReceiveDialogError(null);
    setReceiveForm((prev) => ({
      ...prev,
      date: new Date().toISOString().slice(0, 10),
    }));
  }, [receiveOpen, receiveTarget?.id]);

  useEffect(() => {
    if (!receiveOpen || !receiveTarget?.id) {
      setReceiveDetail(null);
      setIsReceiveDetailLoading(false);
      setIsReceiveDetailError(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const fetchReceiveDetail = async () => {
      try {
        setIsReceiveDetailLoading(true);
        setIsReceiveDetailError(false);
        const response = await fetch(`/api/purchase-orders/${receiveTarget.id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load purchase order detail");
        }

        const payload = (await response.json()) as ReceiveDetail;
        if (!isCancelled) {
          setReceiveDetail(payload);
        }
      } catch (err) {
        if (isCancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        console.error("GET /api/purchase-orders/[id]", err);
        setIsReceiveDetailError(true);
        setReceiveDetail(null);
      } finally {
        if (!isCancelled) {
          setIsReceiveDetailLoading(false);
        }
      }
    };

    fetchReceiveDetail();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [receiveOpen, receiveTarget?.id]);

  useEffect(() => {
    if (!receiveOpen) {
      return;
    }
    if (!receiveDetail?.items?.length) {
      return;
    }

    const totalQty = receiveDetail.items.reduce((sum, item) => {
      const numeric = Number(item?.qty ?? 0);
      return Number.isFinite(numeric) ? sum + numeric : sum;
    }, 0);

    setReceiveForm((prev) => {
      if (prev.qty) {
        return prev;
      }
      return {
        ...prev,
        qty: totalQty > 0 ? String(Number(totalQty.toFixed(4))) : "",
      };
    });
  }, [receiveOpen, receiveDetail]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setPage(1);
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortDirection("asc");
      return field;
    });
  }, []);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUpDownIcon className="tw-h-4 tw-w-4 tw-text-blue-gray-300" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="tw-h-4 tw-w-4 tw-text-blue-gray-500" />
    ) : (
      <ChevronDownIcon className="tw-h-4 tw-w-4 tw-text-blue-gray-500" />
    );
  };

  const params = useMemo<PurchaseOrderParams>(
    () => ({
      page,
      pageSize,
      sort: `${sortField}:${sortDirection}` as const,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [page, pageSize, search, sortDirection, sortField, statusFilter]
  );

  const { data, isLoading, isError, error, mutate } = usePurchaseOrders(params);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));

  const handleApproval = useCallback(
    async (poId: string, nextStatus: ApprovalState, currentStatus: ApprovalState | "PENDING" | undefined) => {
      const previousStatus = approvalLocal[poId] ?? currentStatus;
      if (previousStatus === nextStatus) {
        return;
      }

      setApprovalLocal((prev) => ({ ...prev, [poId]: nextStatus }));

      try {
        const response = await fetch("/api/purchase-orders/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: poId, status: nextStatus }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = typeof payload?.error === "string" ? payload.error : "Failed to update approval";
          throw new Error(message);
        }

        await mutate();
        setApprovalLocal((prev) => {
          const clone = { ...prev };
          delete clone[poId];
          return clone;
        });
      } catch (error) {
        console.error("Update purchase order approval failed", error);
        setApprovalLocal((prev) => {
          const clone = { ...prev };
          if (previousStatus && previousStatus !== "PENDING") {
            clone[poId] = previousStatus as ApprovalState;
          } else {
            delete clone[poId];
          }
          return clone;
        });
      }
    },
    [approvalLocal, mutate]
  );

  const handleStatusUpdate = async () => {
    if (!updateTarget) return;
    try {
      setIsUpdating(true);
      setUpdateError(null);
      const response = await fetch(`/api/purchase-orders/${updateTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: updateTarget.nextStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setUpdateError(payload.message ?? "Unable to update status");
        return;
      }

      setUpdateTarget(null);
      await mutate();
    } catch (err) {
      console.error("PATCH /api/purchase-orders/[id]", err);
      setUpdateError("Unexpected error while updating the purchase order");
    } finally {
      setIsUpdating(false);
    }
  };

  const onOpenReceive = (poId: string, poNo: string) => {
    setUpdateTarget(null);
    setReceiveTarget({ id: poId, poNo });
    setReceiveDetail(null);
    setIsReceiveDetailError(false);
    setIsReceiveDetailLoading(false);
    setReceiveForm({ qty: "", date: new Date().toISOString().slice(0, 10) });
    setReceiveDialogError(null);
    setReceiveOpen(true);
  };

  const onCloseReceive = () => {
    setReceiveOpen(false);
    setReceiveTarget(null);
    setReceiveDetail(null);
    setIsReceiveDetailError(false);
    setIsReceiveDetailLoading(false);
    setReceiveDialogError(null);
    setReceiveForm({ qty: "", date: new Date().toISOString().slice(0, 10) });
  };

  const renderPriorityPill = (priority: PriorityValue) => {
    const classes = PRIORITY_PILL_CLASSES[priority] ?? PRIORITY_PILL_CLASSES.Normal;

    return (
      <span
        className={`tw-inline-flex tw-items-center tw-justify-center tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-uppercase ${classes}`}
        title={priority}
      >
        {priority}
      </span>
    );
  };

  const renderStatusPill = (status: PoStatus, isClosed: boolean) => {
    const classes = STATUS_PILL_CLASSES[status] ?? STATUS_PILL_CLASSES.OPEN;
    const emphasis = isClosed ? " tw-ring-1 tw-ring-emerald-200" : "";

    return (
      <span
        className={`tw-inline-flex tw-items-center tw-justify-center tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-uppercase ${classes}${emphasis}`}
        title={status}
      >
        {status}
      </span>
    );
  };

  const renderBody = () => {
    const columnCount = TABLE_COLUMNS.length;

    if (isLoading) {
      return (
        <tr>
          <td className="tw-px-4 tw-py-8 tw-text-center tw-text-blue-gray-400" colSpan={columnCount}>
            Loading purchase orders...
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td className="tw-px-4 tw-py-8" colSpan={columnCount}>
            <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {error instanceof Error ? error.message : "Unable to load purchase orders"}
              </Typography>
              <Button size="sm" color="gray" onClick={() => mutate()}>
                Retry
              </Button>
            </div>
          </td>
        </tr>
      );
    }

    if (!rows.length) {
      return (
        <tr>
          <td className="tw-px-4 tw-py-8 tw-text-center tw-text-blue-gray-400" colSpan={columnCount}>
            No purchase orders yet
          </td>
        </tr>
      );
    }

    return rows.map((row) => {
      const itemCode = row.primaryItemCode ?? "—";
      const itemName = row.primaryItemName ?? "—";
      const vendorName = row.vendorName ?? "—";
      const departmentLabel = row.departmentName ?? "—";
      const serverApproval = (row.approvalStatus ?? "PENDING") as ApprovalState | "PENDING";
      const isClosed = row.status === "CLOSED";
      const mutedTextClass = isClosed ? "tw-text-emerald-800" : "tw-text-blue-gray-500";
      const strongTextClass = isClosed ? "tw-text-emerald-900" : "tw-text-blue-gray-600";
      const rowHighlightClass = isClosed
        ? "tw-transition-colors tw-duration-300 hover:tw-bg-emerald-100"
        : "tw-transition-colors tw-duration-150 hover:tw-bg-blue-gray-50/60";
      const cellHighlightClass = isClosed
        ? "tw-bg-emerald-50 tw-border-y tw-border-emerald-100"
        : "";
      const leadingCellHighlight = isClosed ? "tw-rounded-l-lg tw-border-l tw-border-emerald-100" : "";
      const trailingCellHighlight = isClosed ? "tw-rounded-r-lg tw-border-r tw-border-emerald-100" : "";

      const effectiveApproval: ApprovalState | "PENDING" =
        approvalLocal[row.id] ?? serverApproval;
      const isApproved = effectiveApproval === "APPROVED";
      const isRejected = effectiveApproval === "REJECTED";
      const isHold = effectiveApproval === "HOLD";

      const createdDate = formatDate(row.createdAt);
      const createdTitle = createdDate === "—" ? "—" : new Date(row.createdAt).toLocaleString();
      const subtotalLabel = formatSAR(row.subtotal);
      const vatLabel = formatSAR(row.vatAmount);
      const totalLabel = formatSAR(row.total);

      const cellClass = (key: ColumnConfig["key"], extra: string = "") =>
        `${BASE_CELL_CLASS} ${COLUMN_CELL_CLASS[key]} ${extra}`.trim();

      return (
        <tr key={row.id} className={`tw-border-t tw-border-blue-gray-50 ${rowHighlightClass}`}>
          <td className={cellClass("poNo", `${cellHighlightClass} ${leadingCellHighlight}`)}>
            <div
              className={`tw-truncate tw-max-w-[140px] tw-font-mono tw-text-xs tw-font-semibold tw-tracking-tight ${strongTextClass}`}
              title={row.poNo}
            >
              {row.poNo}
            </div>
          </td>
          <td className={cellClass("primaryItemCode", cellHighlightClass)}>
            <div
              className={`tw-truncate tw-max-w-[110px] tw-font-mono tw-text-xs tw-tracking-tight ${mutedTextClass}`}
              title={itemCode}
            >
              {itemCode}
            </div>
          </td>
          <td className={cellClass("primaryItemName", cellHighlightClass)}>
            <div className={`tw-truncate tw-max-w-[300px] ${strongTextClass}`} title={itemName}>
              {itemName}
            </div>
          </td>
          <td className={cellClass("vendorName", cellHighlightClass)}>
            <div className={`tw-truncate tw-max-w-[160px] ${strongTextClass}`} title={vendorName}>
              {vendorName}
            </div>
          </td>
          <td className={cellClass("department", cellHighlightClass)}>
            <div className={`tw-truncate tw-max-w-[130px] ${mutedTextClass}`} title={departmentLabel}>
              {departmentLabel}
            </div>
          </td>
          <td className={cellClass("createdAt", `${cellHighlightClass} tw-tabular-nums`)}>
            <span className={`tw-block tw-tabular-nums ${mutedTextClass}`} title={createdTitle}>
              {createdDate}
            </span>
          </td>
          <td className={cellClass("priority", cellHighlightClass)}>
            {renderPriorityPill(row.priority as PriorityValue)}
          </td>
          <td className={cellClass("status", cellHighlightClass)}>
            {renderStatusPill(row.status, isClosed)}
          </td>
          <td className={cellClass("subtotal", `${cellHighlightClass} tw-tabular-nums`)}>
            <div className={`tw-truncate tw-max-w-[110px] tw-tabular-nums ${mutedTextClass}`} title={subtotalLabel}>
              {subtotalLabel}
            </div>
          </td>
          <td className={cellClass("vatAmount", `${cellHighlightClass} tw-tabular-nums`)}>
            <div className={`tw-truncate tw-max-w-[110px] tw-tabular-nums ${mutedTextClass}`} title={vatLabel}>
              {vatLabel}
            </div>
          </td>
          <td className={cellClass("total", `${cellHighlightClass} tw-tabular-nums`)}>
            <div className={`tw-truncate tw-max-w-[130px] tw-tabular-nums ${strongTextClass}`} title={totalLabel}>
              {totalLabel}
            </div>
          </td>
          <td className={cellClass("approvals", cellHighlightClass)}>
            <div className="tw-mx-auto tw-flex tw-items-center tw-justify-center tw-gap-2">
              <button
                type="button"
                title="Approve"
                aria-label="Approve"
                className={`tw-rounded tw-p-1 hover:tw-bg-emerald-50 ${isApproved ? "tw-text-emerald-600" : "tw-text-emerald-500"}`}
                onClick={() => handleApproval(row.id, "APPROVED", serverApproval)}
              >
                <Check className="tw-h-4 tw-w-4" />
              </button>
              <button
                type="button"
                title="Reject"
                aria-label="Reject"
                className={`tw-rounded tw-p-1 hover:tw-bg-rose-50 ${isRejected ? "tw-text-rose-600" : "tw-text-rose-500"}`}
                onClick={() => handleApproval(row.id, "REJECTED", serverApproval)}
              >
                <X className="tw-h-4 tw-w-4" />
              </button>
              <button
                type="button"
                title="Hold"
                aria-label="Hold"
                className={`tw-rounded tw-p-1 hover:tw-bg-amber-50 ${isHold ? "tw-text-amber-600" : "tw-text-amber-500"}`}
                onClick={() => handleApproval(row.id, "HOLD", serverApproval)}
              >
                <Pause className="tw-h-4 tw-w-4" />
              </button>
            </div>
          </td>
          <td className={cellClass("actions", `${cellHighlightClass} ${trailingCellHighlight}`)}>
            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-slate-500">
              <Tooltip content="View details">
                <span>
                  <IconButton
                    variant="text"
                    color="blue-gray"
                    onClick={() => setViewId(row.id)}
                  >
                    <EyeIcon className="tw-h-[18px] tw-w-[18px]" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip content="Mark received">
                <span>
                  <IconButton
                    variant="text"
                    color="green"
                    onClick={() => onOpenReceive(row.id, row.poNo)}
                    disabled={row.status === "RECEIVED" || row.status === "CLOSED"}
                  >
                    <InboxArrowDownIcon className="tw-h-[18px] tw-w-[18px]" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip content="Close order">
                <span>
                  <IconButton
                    variant="text"
                    color="blue-gray"
                    onClick={() => setUpdateTarget({ id: row.id, nextStatus: "CLOSED" })}
                    disabled={row.status === "CLOSED"}
                  >
                    <CheckCircleIcon className="tw-h-[18px] tw-w-[18px]" />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-shadow-sm">
        <div className="tw-flex tw-flex-col tw-gap-4 tw-p-3 md:tw-p-4 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h5" color="blue-gray">
              Purchase Orders
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Track issued purchase orders
            </Typography>
          </div>
          <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
            <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter((value as string) ?? "");
                  setPage(1);
                }}
                className="sm:tw-w-52"
              >
                <Option value="">All statuses</Option>
                {STATUS_LABELS.map((status) => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Select>
              <PageSizeSelect
                value={pageSize}
                onChange={handlePageSizeChange}
                className="sm:tw-w-36"
                label="Rows per page"
              />
              <Button variant="outlined" color="blue-gray" size="sm" disabled>
                Export
              </Button>
            </div>
            <Input
              label="Search purchase orders"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="lg:tw-w-64"
              crossOrigin="anonymous"
            />
          </div>
        </div>
        <div className="tw-overflow-x-hidden tw-px-1">
          <table className="tw-w-full tw-table-fixed tw-text-[13.5px] tw-text-left">
            <colgroup>
              <col className="tw-w-[160px]" />
              <col className="tw-w-[120px]" />
              <col className="tw-w-[300px]" />
              <col className="tw-w-[170px]" />
              <col className="tw-w-[140px]" />
              <col className="tw-w-[110px]" />
              <col className="tw-w-[120px]" />
              <col className="tw-w-[120px]" />
              <col className="tw-w-[120px] hidden xl:table-column" />
              <col className="tw-w-[110px] hidden 2xl:table-column" />
              <col className="tw-w-[140px]" />
              <col className="tw-w-[110px]" />
              <col className="tw-w-[120px]" />
            </colgroup>
            <thead className="tw-bg-slate-50/70">
              <tr className="tw-border-b tw-border-slate-200/80">
                {TABLE_COLUMNS.map(({ key, label, sortField: columnSortField, headerClass }) => {
                  const sortable = Boolean(columnSortField);
                  const isActive = columnSortField ? sortField === columnSortField : false;
                  const ariaSort: "ascending" | "descending" | "none" | undefined = !sortable
                    ? undefined
                    : isActive
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                  const justifyClass = headerClass.includes("tw-text-right")
                    ? "tw-justify-end"
                    : headerClass.includes("tw-text-center")
                    ? "tw-justify-center"
                    : "tw-justify-start";
                  return (
                    <th key={key} className={`${headerClass} tw-align-middle`} aria-sort={ariaSort}>
                      {sortable ? (
                        <div className={`tw-flex tw-w-full tw-items-center ${justifyClass}`}>
                          <button
                            type="button"
                            onClick={() => handleSort(columnSortField!)}
                            className="tw-inline-flex tw-items-center tw-gap-1 tw-text-blue-gray-500 focus:tw-outline-none"
                            aria-label={`Sort by ${label}`}
                            aria-pressed={isActive}
                          >
                            <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-blue-gray-600">
                              {label}
                            </span>
                            {getSortIcon(columnSortField!)}
                          </button>
                        </div>
                      ) : (
                        <div className={`tw-flex tw-w-full tw-items-center ${justifyClass}`}>
                          <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-blue-gray-600">
                            {label}
                          </span>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-px-4 tw-py-3 md:tw-px-6 md:tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Page {currentPage} of {totalPages}
          </Typography>
          <div className="tw-flex tw-gap-2">
            <Button
              variant="outlined"
              color="blue-gray"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outlined"
              color="blue-gray"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ViewPurchaseOrderModal open={Boolean(viewId)} poId={viewId} onClose={() => setViewId(null)} />

      <Dialog
        open={Boolean(updateTarget)}
        handler={() => {
          setUpdateTarget(null);
          setUpdateError(null);
        }}
        size="sm"
      >
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Update Status
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Confirm changing the purchase order status to {updateTarget?.nextStatus}
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-3">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            This update will notify downstream workflows.
          </Typography>
          {updateError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {updateError}
            </Typography>
          ) : null}
        </DialogBody>
        <DialogFooter className="tw-flex tw-gap-3">
          <Button
            variant="text"
            color="blue-gray"
            onClick={() => {
              setUpdateTarget(null);
              setUpdateError(null);
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            color="green"
            onClick={handleStatusUpdate}
            disabled={isUpdating || !updateTarget}
          >
            {isUpdating ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={receiveOpen} handler={onCloseReceive} size="sm">
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Mark Purchase Order Received
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Confirm the quantity received and the receipt date.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-4">
          {receiveTarget ? (
            <div className="tw-flex tw-flex-col tw-gap-1">
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Purchase Order
              </Typography>
              <Typography variant="h6" className="!tw-font-semibold !tw-text-blue-gray-900">
                {receiveTarget.poNo}
              </Typography>
            </div>
          ) : null}

          {isReceiveDetailLoading ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              Loading purchase order details…
            </Typography>
          ) : isReceiveDetailError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              Unable to fetch purchase order items. Quantity defaults may be inaccurate.
            </Typography>
          ) : null}

          <Input
            type="number"
            label="Quantity received"
            value={receiveForm.qty}
            min="0"
            step="0.01"
            onChange={(event) =>
              setReceiveForm((prev) => ({ ...prev, qty: event.target.value }))
            }
            crossOrigin="anonymous"
          />

          <Input
            type="date"
            label="Received date"
            value={receiveForm.date}
            onChange={(event) =>
              setReceiveForm((prev) => ({ ...prev, date: event.target.value }))
            }
          />

          {receiveDialogError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {receiveDialogError}
            </Typography>
          ) : null}
        </DialogBody>
        <DialogFooter className="tw-space-x-2">
          <Button
            variant="text"
            color="gray"
            onClick={onCloseReceive}
            disabled={isReceiveSubmitting}
          >
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={async () => {
              if (!receiveTarget) return;
              const qtyValue = Number(receiveForm.qty);
              if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
                setReceiveDialogError("Enter a valid quantity greater than zero.");
                return;
              }
              const dateValue = receiveForm.date
                ? new Date(`${receiveForm.date}T00:00:00`)
                : new Date();

              try {
                setIsReceiveSubmitting(true);
                setReceiveDialogError(null);
                const response = await fetch(`/api/purchase-orders/${receiveTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "RECEIVED",
                    receivedQty: qtyValue,
                    receivedAt: dateValue.toISOString(),
                  }),
                });

                if (!response.ok) {
                  const payload = await response.json().catch(() => ({}));
                  setReceiveDialogError(payload.message ?? "Unable to mark as received");
                  return;
                }

                onCloseReceive();
                await mutate();
              } catch (err) {
                console.error("PATCH /api/purchase-orders/[id] received", err);
                setReceiveDialogError("Unexpected error while marking the order received.");
              } finally {
                setIsReceiveSubmitting(false);
              }
            }}
            disabled={isReceiveSubmitting || !receiveTarget}
          >
            {isReceiveSubmitting ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function ViewPurchaseOrderModal({
  open,
  poId,
  onClose,
}: {
  open: boolean;
  poId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = usePurchaseOrder(poId);

  return (
    <Dialog open={open} handler={onClose} size="lg">
      <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
        <Typography variant="h5" color="blue-gray">
          {data ? data.poNo : "Purchase Order"}
        </Typography>
        {data ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {data.vendorName} • {data.quotationNo}
          </Typography>
        ) : null}
      </DialogHeader>
      <DialogBody className="tw-space-y-4">
        {isLoading ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            Loading purchase order…
          </Typography>
        ) : isError ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            {error instanceof Error ? error.message : "Unable to load purchase order"}
          </Typography>
        ) : data ? (
          <div className="tw-space-y-6">
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
              <InfoField label="PO Number" value={data.poNo} />
              <InfoField label="RFQ Number" value={data.quotationNo} />
              <InfoField label="Status" value={data.status} />
              <InfoField label="Priority" value={data.priority} />
              <InfoField label="Created" value={formatDate(data.createdAt)} />
            </div>
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-4">
              <InfoField label="Subtotal" value={formatSAR(data.subtotal)} />
              <InfoField label="VAT" value={formatSAR(data.vatAmount)} />
              <InfoField label="Total" value={formatSAR(data.total)} />
              <InfoField label="Currency" value={data.currency} />
            </div>
            <div>
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Items
              </Typography>
              <div className="tw-mt-3 tw-space-y-3">
                {data.items.map((item) => (
                  <div key={item.id} className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-p-3 tw-shadow-sm">
                    <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
                      <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-600">
                        {item.name}
                      </Typography>
                      <Chip
                        value={item.unit}
                        color="blue"
                        variant="ghost"
                        className="tw-uppercase"
                      />
                    </div>
                    <div className="tw-mt-2 tw-grid tw-grid-cols-2 tw-gap-3 md:tw-grid-cols-4">
                      <InfoField label="Material" value={item.materialCode ?? "—"} />
                      <InfoField label="Qty" value={Number(item.qty).toFixed(2)} />
                      <InfoField label="Unit Price" value={formatSAR(item.unitPrice)} />
                      <InfoField label="Line Total" value={formatSAR(item.lineTotal)} />
                    </div>
                    {item.note ? (
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                        {item.note}
                      </Typography>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="text" color="blue-gray" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-1">
      <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
        {label}
      </Typography>
      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-600">
        {value}
      </Typography>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toISOString().slice(0, 10);
}
