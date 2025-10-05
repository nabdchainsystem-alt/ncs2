"use client";

import { useEffect, useMemo, useState } from "react";

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
import {
  formatSAR,
  usePurchaseOrder,
  usePurchaseOrders,
  type PoStatus,
} from "@/hooks/orders/usePurchaseOrders";
import { EyeIcon, CheckCircleIcon, InboxArrowDownIcon } from "@heroicons/react/24/outline";

const STATUS_COLORS: Record<PoStatus, "blue" | "amber" | "green" | "red"> = {
  OPEN: "blue",
  PARTIAL: "amber",
  RECEIVED: "green",
  CLOSED: "green",
  CANCELLED: "red",
};

const STATUS_LABELS: PoStatus[] = ["OPEN", "PARTIAL", "RECEIVED", "CLOSED", "CANCELLED"];

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"] as const;
type PriorityValue = (typeof PRIORITY_OPTIONS)[number];

const PRIORITY_COLORS: Record<PriorityValue, "blue-gray" | "blue" | "amber" | "red"> = {
  Low: "blue-gray",
  Normal: "blue",
  High: "amber",
  Urgent: "red",
};

const TABLE_HEADERS = [
  "PO NO",
  "ITEM CODE",
  "ITEM NAME",
  "VENDOR",
  "CREATED",
  "PRIORITY",
  "STATUS",
  "SUBTOTAL",
  "VAT",
  "TOTAL",
  "ACTIONS",
] as const;

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
  const pageSize = 10;
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

  const params = useMemo<PurchaseOrderParams>(
    () => ({
      page,
      pageSize,
      sort: "createdAt:desc",
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [page, pageSize, search, statusFilter]
  );

  const { data, isLoading, isError, error, mutate } = usePurchaseOrders(params);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));

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

  const renderStatusChip = (status: PoStatus) => (
    <Chip
      value={status}
      color={STATUS_COLORS[status] ?? "blue"}
      variant="ghost"
      className="tw-uppercase"
    />
  );

  const renderBody = () => {
    const columnCount = TABLE_HEADERS.length;

    if (isLoading) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-10 tw-text-center tw-text-blue-gray-400" colSpan={columnCount}>
            Loading purchase orders...
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-10" colSpan={columnCount}>
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
          <td className="tw-px-6 tw-py-10 tw-text-center tw-text-blue-gray-400" colSpan={columnCount}>
            No purchase orders yet
          </td>
        </tr>
      );
    }

    return rows.map((row) => {
      const itemCode = row.primaryItemCode ?? "—";
      const itemName = row.primaryItemName ?? "—";

      return (
        <tr key={row.id} className="tw-border-t tw-border-blue-gray-50">
          <td className="tw-px-6 tw-py-4 tw-text-center tw-font-semibold tw-text-blue-gray-600">
            {row.poNo}
          </td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{itemCode}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-600">{itemName}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{row.vendorName}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{formatDate(row.createdAt)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center">
            <Chip
              value={row.priority}
              color={PRIORITY_COLORS[row.priority as PriorityValue] ?? "blue-gray"}
              variant="ghost"
              className="tw-uppercase"
            />
          </td>
          <td className="tw-px-6 tw-py-4 tw-text-center">{renderStatusChip(row.status)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{formatSAR(row.subtotal)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{formatSAR(row.vatAmount)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{formatSAR(row.total)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center">
            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
              <Tooltip content="View details">
                <span>
                  <IconButton
                    variant="text"
                    color="blue-gray"
                    onClick={() => setViewId(row.id)}
                  >
                    <EyeIcon className="tw-h-4 tw-w-4" />
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
                    <InboxArrowDownIcon className="tw-h-4 tw-w-4" />
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
                    <CheckCircleIcon className="tw-h-4 tw-w-4" />
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
      <Card className="tw-rounded-xl tw-shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          className="tw-flex tw-flex-col tw-gap-4 tw-rounded-none tw-p-6 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h5" color="blue-gray">
              Purchase Orders
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Track issued purchase orders
            </Typography>
          </div>
          <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-center">
            <div className="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center">
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
        </CardHeader>
        <CardBody className="tw-overflow-x-auto tw-p-0">
          <table className="tw-min-w-max tw-w-full tw-table-auto tw-text-center">
            <thead className="tw-bg-blue-gray-50/60">
              <tr>
                {TABLE_HEADERS.map((header) => (
                  <th key={header} className="tw-px-6 tw-py-4 tw-text-center">
                    <Typography
                      variant="small"
                      color="blue-gray"
                      className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                    >
                      {header}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </CardBody>
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-px-6 tw-py-4">
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
      </Card>

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString();
}
