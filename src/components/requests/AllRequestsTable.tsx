"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  Typography,
} from "@/components/MaterialTailwind";
import PageSizeSelect from "@/components/common/PageSizeSelect";
import { useRequests } from "@/hooks/requests";
import type { RequestRow } from "@/hooks/requests";
import NewRequestModal from "@/components/requests/modals/NewRequestModal";
import ViewRequestModal from "@/components/requests/modals/ViewRequestModal";
import CreateRfqModal from "@/components/requests/modals/CreateRfqModal";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const STATUS_FALLBACK: Record<RequestRow["status"], { label: string; color: "blue" | "amber" | "green" | "red" }> = {
  OPEN: { label: "Open", color: "blue" },
  PENDING: { label: "Pending", color: "amber" },
  CLOSED: { label: "Closed", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
};

const PRIORITY_CHIP_COLORS: Record<RequestRow["priority"], "green" | "blue" | "amber" | "red"> = {
  Low: "green",
  Normal: "blue",
  High: "amber",
  Urgent: "red",
};

const APPROVAL_STATUS_DISPLAY: Record<RequestRow["approvalStatus"], { label: string; color: "blue" | "green" | "red" }> = {
  PENDING: { label: "Open", color: "blue" },
  APPROVED: { label: "Approved", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
};

type SortField =
  | "code"
  | "primaryItemCode"
  | "primaryItemName"
  | "createdAt"
  | "departmentName"
  | "warehouseName"
  | "machineName"
  | "status"
  | "priority";

type ColumnConfig = {
  key: string;
  label: string;
  sortField?: SortField;
};

const COLUMN_ALIGNMENT: Record<string, "left" | "center"> = {
  code: "left",
  primaryItemCode: "left",
  primaryItemName: "left",
  createdAt: "left",
  departmentName: "left",
  warehouseName: "left",
  machineName: "left",
  status: "center",
  priority: "center",
  approval: "center",
  actions: "center",
};

const TABLE_COLUMNS: ColumnConfig[] = [
  { key: "code", label: "REQUEST", sortField: "code" },
  { key: "primaryItemCode", label: "ITEM CODE", sortField: "primaryItemCode" },
  { key: "primaryItemName", label: "ITEM NAME", sortField: "primaryItemName" },
  { key: "createdAt", label: "CREATED", sortField: "createdAt" },
  { key: "departmentName", label: "DEPARTMENT", sortField: "departmentName" },
  { key: "warehouseName", label: "WAREHOUSE", sortField: "warehouseName" },
  { key: "machineName", label: "MACHINE", sortField: "machineName" },
  { key: "status", label: "STATUS", sortField: "status" },
  { key: "priority", label: "PRIORITY", sortField: "priority" },
  { key: "approval", label: "APPROVAL" },
  { key: "actions", label: "ACTIONS" },
];

const PRIORITY_VALUES = new Set<RequestRow["priority"]>(["Low", "Normal", "High", "Urgent"]);

type DeleteTarget = { id: string; code: string } | null;

type RequestParams = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
};

export default function AllRequestsTable() {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [viewRequestId, setViewRequestId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rfqModal, setRfqModal] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });

  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const newRequestParam = searchParams.get("newRequest");

  const [pageSize, setPageSize] = useState<number>(5);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const params = useMemo<RequestParams>(
    () => ({
      page,
      pageSize,
      sort: `${sortField}:${sortDirection}` as const,
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [page, pageSize, search, sortField, sortDirection]
  );

  const {
    rows,
    total,
    page: currentPage,
    pageSize: currentPageSize,
    isLoading,
    isError,
    error,
    mutate,
  } = useRequests(params);

  const updateNewRequestParam = useCallback(
    (value: "1" | null) => {
      const current = searchParams.get("newRequest");
      if (value === current || (!value && current === null)) {
        return;
      }
      const paramsCopy = new URLSearchParams(searchParams);
      if (value) {
        paramsCopy.set("newRequest", value);
      } else {
        paramsCopy.delete("newRequest");
      }
      const query = paramsCopy.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const handleOpenNewRequestModal = useCallback(() => {
    setNewModalOpen(true);
    updateNewRequestParam("1");
  }, [updateNewRequestParam]);

  const handleCloseNewRequestModal = useCallback(() => {
    setNewModalOpen(false);
    updateNewRequestParam(null);
  }, [updateNewRequestParam]);

  useEffect(() => {
    if (newRequestParam === "1") {
      setNewModalOpen(true);
    }
  }, [newRequestParam]);

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

  const handleApprovalUpdate = useCallback(
    async (requestId: string, currentStatus: RequestRow["approvalStatus"], nextStatus: "APPROVED" | "REJECTED") => {
      if (currentStatus === nextStatus) {
        return;
      }

      try {
        setApprovalBusyId(requestId);
        setApprovalError(null);

        const response = await fetch(`/api/requests/${requestId}/approval`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus: nextStatus }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = typeof payload.message === "string" ? payload.message : "Failed to update approval";
          throw new Error(message);
        }

        await mutate();
      } catch (err) {
        console.error("Update approval failed", err);
        setApprovalError(err instanceof Error ? err.message : "Failed to update approval");
      } finally {
        setApprovalBusyId((prev) => (prev === requestId ? null : prev));
      }
    },
    [mutate]
  );

  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  const safeRows: RequestRow[] = Array.isArray(rows) ? rows : [];

  const handleDeleteRequest = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const response = await fetch(`/api/requests/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setDeleteError(payload.message ?? "Failed to delete request");
        return;
      }

      await mutate();
      setDeleteTarget(null);
      setDeleteError(null);
    } catch (err) {
      console.error("Delete request failed", err);
      setDeleteError("Unexpected error while deleting the request");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusChip = (row: RequestRow) => {
    if (row.status === "CLOSED" || row.status === "CANCELLED") {
      const fallback = STATUS_FALLBACK[row.status] ?? STATUS_FALLBACK.OPEN;
      return <Chip value={fallback.label} color={fallback.color} variant="ghost" className="tw-capitalize" />;
    }

    const display = APPROVAL_STATUS_DISPLAY[row.approvalStatus] ?? APPROVAL_STATUS_DISPLAY.PENDING;
    return <Chip value={display.label} color={display.color} variant="ghost" className="tw-capitalize" />;
  };

  const renderPriorityChip = (priority: RequestRow["priority"]) => {
    const value = PRIORITY_VALUES.has(priority) ? priority : "Normal";
    return <Chip value={value} color={PRIORITY_CHIP_COLORS[value]} variant="ghost" className="tw-capitalize" />;
  };

  const columnSpan = TABLE_COLUMNS.length;

  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={columnSpan} className="tw-px-6 tw-py-10 tw-text-center tw-text-blue-gray-400">
            Loading requests...
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={columnSpan} className="tw-px-6 tw-py-10">
            <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {error instanceof Error ? error.message : "Unable to load requests"}
              </Typography>
              <Button size="sm" color="gray" onClick={() => mutate()}>
                Retry
              </Button>
            </div>
          </td>
        </tr>
      );
    }

    if (!safeRows.length) {
      return (
        <tr>
          <td colSpan={columnSpan} className="tw-px-6 tw-py-10 tw-text-center tw-text-blue-gray-400">
            No requests yet
          </td>
        </tr>
      );
    }

    return safeRows.map((row) => {
      const approveActive = row.approvalStatus === "APPROVED";
      const rejectActive = row.approvalStatus === "REJECTED";
      const isProcessing = approvalBusyId === row.id;
      const isApproved = approveActive;
      return (
        <tr key={row.id} className="tw-border-t tw-border-blue-gray-50 hover:tw-bg-blue-gray-50/20">
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-semibold tw-text-blue-gray-700">{row.code}</td>
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-text-blue-gray-500">{row.primaryItemCode ?? "—"}</td>
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-text-blue-gray-600">{row.primaryItemName ?? "—"}</td>
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-text-blue-gray-500">{formatDate(row.createdAt)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-text-blue-gray-500">{row.departmentName ?? "—"}</td>
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-text-blue-gray-500">{row.warehouseName ?? "—"}</td>
          <td className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-text-blue-gray-500">{row.machineName ?? "—"}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center">{renderStatusChip(row)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center">{renderPriorityChip(row.priority)}</td>
          <td className="tw-px-6 tw-py-4 tw-text-center">
            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
              <IconButton
                variant="text"
                color={approveActive ? "green" : "blue-gray"}
                size="sm"
                aria-label={approveActive ? "Approved" : "Approve request"}
                aria-pressed={approveActive}
                disabled={isProcessing || approveActive}
                onClick={() => handleApprovalUpdate(row.id, row.approvalStatus, "APPROVED")}
                title={approveActive ? "Approved" : "Approve request"}
              >
                <CheckCircleIcon className="tw-h-4 tw-w-4" />
              </IconButton>
              <IconButton
                variant="text"
                color={rejectActive ? "red" : "blue-gray"}
                size="sm"
                aria-label={rejectActive ? "Rejected" : "Reject request"}
                aria-pressed={rejectActive}
                disabled={isProcessing || rejectActive}
                onClick={() => handleApprovalUpdate(row.id, row.approvalStatus, "REJECTED")}
                title={rejectActive ? "Rejected" : "Reject request"}
              >
                <XCircleIcon className="tw-h-4 tw-w-4" />
              </IconButton>
            </div>
          </td>
          <td className="tw-px-6 tw-py-4">
            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
              <IconButton
                variant="text"
                color="blue-gray"
                onClick={() => setViewRequestId(row.id)}
                size="sm"
              >
                <PencilSquareIcon className="tw-h-4 tw-w-4" />
              </IconButton>
              <IconButton
                variant="text"
                color="red"
                onClick={() => setDeleteTarget({ id: row.id, code: row.code })}
                size="sm"
              >
                <TrashIcon className="tw-h-4 tw-w-4" />
              </IconButton>
              <IconButton
                variant="text"
                color={isApproved ? "green" : "blue-gray"}
                onClick={() => setRfqModal({ open: true, requestId: row.id })}
                size="sm"
                aria-label="Create RFQ"
                disabled={!isApproved || isProcessing}
                title={isApproved ? "Create RFQ" : "Approve request to create an RFQ"}
              >
                <ClipboardDocumentListIcon className="tw-h-4 tw-w-4" />
              </IconButton>
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
          className="tw-flex tw-flex-col tw-gap-4 tw-rounded-none tw-p-6 md:tw-flex-row md:tw-items-center md:tw-justify-between"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h5" color="blue-gray">
              All Requests
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Track the latest purchase requests and their status.
            </Typography>
          </div>
          <div className="tw-flex tw-flex-col tw-gap-3 md:tw-flex-row md:tw-items-center md:tw-justify-between">
            <div className="tw-flex tw-items-center tw-gap-2">
              <IconButton
                variant="text"
                color="blue-gray"
                onClick={() => console.info("Import action")}
                aria-label="Import"
              >
                <ArrowDownTrayIcon className="tw-h-5 tw-w-5" />
              </IconButton>
              <IconButton
                variant="text"
                color="blue-gray"
                onClick={() => console.info("Export action")}
                aria-label="Export"
              >
                <ArrowUpTrayIcon className="tw-h-5 tw-w-5" />
              </IconButton>
              <IconButton
                variant="text"
                color="blue-gray"
                onClick={handleOpenNewRequestModal}
                aria-label="New request"
              >
                <PlusIcon className="tw-h-5 tw-w-5" />
              </IconButton>
            </div>
            <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center">
              <PageSizeSelect
                value={pageSize}
                onChange={handlePageSizeChange}
                className="sm:tw-w-36"
                label="Rows per page"
              />
              <Input
                label="Search"
                variant="outlined"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="sm:tw-w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="tw-overflow-x-auto tw-p-0">
          {approvalError ? (
            <div className="tw-px-6 tw-py-3">
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {approvalError}
              </Typography>
            </div>
          ) : null}
          <table className="tw-w-full tw-table-auto tw-text-left">
            <thead className="tw-bg-blue-gray-50/60">
              <tr>
                {TABLE_COLUMNS.map(({ key, label, sortField: columnSortField }) => {
                  const sortable = Boolean(columnSortField);
                  const isActive = columnSortField ? sortField === columnSortField : false;
                  const ariaSort: "ascending" | "descending" | "none" | undefined = !sortable
                    ? undefined
                    : isActive
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                  const alignment = COLUMN_ALIGNMENT[key] ?? "left";
                  const alignClass = alignment === "center" ? "tw-text-center" : "tw-text-left";
                  const justifyClass = alignment === "center" ? "tw-justify-center" : "tw-justify-start";
                  return (
                    <th key={key} className={`tw-px-6 tw-py-4 ${alignClass}`} aria-sort={ariaSort}>
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(columnSortField!)}
                          className={`tw-inline-flex tw-items-center ${justifyClass} tw-gap-1 tw-text-blue-gray-500 focus:tw-outline-none`}
                          aria-label={`Sort by ${label}`}
                          aria-pressed={isActive}
                        >
                          <span className="tw-text-xs tw-font-semibold tw-uppercase tw-opacity-70">{label}</span>
                          {getSortIcon(columnSortField!)}
                        </button>
                      ) : (
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className={`tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70 ${alignClass}`}
                        >
                          {label}
                        </Typography>
                      )}
                    </th>
                  );
                })}
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

      <NewRequestModal
        open={newModalOpen}
        onClose={handleCloseNewRequestModal}
        onCreated={async () => {
          setPage(1);
          await mutate();
        }}
      />

      <ViewRequestModal
        open={Boolean(viewRequestId)}
        requestId={viewRequestId}
        onClose={() => setViewRequestId(null)}
      />

      <CreateRfqModal
        open={rfqModal.open}
        requestId={rfqModal.requestId}
        onClose={() => setRfqModal({ open: false, requestId: null })}
        onCreated={async () => {
          await mutate();
        }}
      />

      {deleteTarget ? (
        <Dialog
          open
          handler={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          size="sm"
        >
          <DialogHeader className="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
            <Typography variant="h5" color="blue-gray">
              Delete Request
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Permanently remove {deleteTarget.code} and its items?
            </Typography>
          </DialogHeader>
          <DialogBody className="tw-space-y-3">
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              This action cannot be undone.
            </Typography>
            {deleteError ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {deleteError}
              </Typography>
            ) : null}
          </DialogBody>
          <DialogFooter className="tw-flex tw-gap-3">
            <Button
              variant="text"
              color="blue-gray"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteRequest} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </Dialog>
      ) : null}
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString();
}
