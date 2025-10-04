"use client";

import { useMemo, useState } from "react";

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
import { useRequests } from "@/hooks/requests";
import type { RequestRow } from "@/hooks/requests";
import NewRequestModal from "@/components/requests/modals/NewRequestModal";
import ViewRequestModal from "@/components/requests/modals/ViewRequestModal";
import {
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const STATUS_CHIP_COLORS: Record<RequestRow["status"], "blue" | "amber" | "green" | "red"> = {
  OPEN: "blue",
  PENDING: "amber",
  CLOSED: "green",
  CANCELLED: "red",
};

const PRIORITY_CHIP_COLORS: Record<RequestRow["priority"], "green" | "blue" | "amber" | "red"> = {
  Low: "green",
  Normal: "blue",
  High: "amber",
  Urgent: "red",
};

const TABLE_HEADERS = [
  "REQUEST",
  "CREATED",
  "DEPARTMENT",
  "WAREHOUSE",
  "MACHINE",
  "STATUS",
  "PRIORITY",
  "ACTIONS",
] as const;

const STATUS_VALUES = new Set<RequestRow["status"]>(["OPEN", "PENDING", "CLOSED", "CANCELLED"]);
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

  const pageSize = 10;

  const params = useMemo<RequestParams>(
    () => ({
      page,
      pageSize,
      sort: "createdAt:desc",
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [page, pageSize, search]
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

  const renderStatusChip = (status: RequestRow["status"]) => {
    const value = STATUS_VALUES.has(status) ? status : "OPEN";
    return <Chip value={value} color={STATUS_CHIP_COLORS[value]} variant="ghost" className="tw-uppercase" />;
  };

  const renderPriorityChip = (priority: RequestRow["priority"]) => {
    const value = PRIORITY_VALUES.has(priority) ? priority : "Normal";
    return <Chip value={value} color={PRIORITY_CHIP_COLORS[value]} variant="ghost" className="tw-capitalize" />;
  };

  const columnSpan = TABLE_HEADERS.length;

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

    return safeRows.map((row) => (
      <tr key={row.id} className="tw-border-t tw-border-blue-gray-50">
        <td className="tw-px-6 tw-py-4 tw-font-medium tw-text-blue-gray-600">{row.code}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{formatDate(row.createdAt)}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{row.departmentName ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{row.warehouseName ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{row.machineName ?? "—"}</td>
        <td className="tw-px-6 tw-py-4">{renderStatusChip(row.status)}</td>
        <td className="tw-px-6 tw-py-4">{renderPriorityChip(row.priority)}</td>
        <td className="tw-px-6 tw-py-4">
          <div className="tw-flex tw-items-center tw-gap-2">
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
              color="green"
              onClick={() => console.info("RFQ action", row.id)}
              size="sm"
            >
              <ClipboardDocumentListIcon className="tw-h-4 tw-w-4" />
            </IconButton>
          </div>
        </td>
      </tr>
    ));
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
          <div className="tw-flex tw-flex-col tw-gap-3 md:tw-flex-row md:tw-items-center">
            <Button variant="outlined" color="blue-gray" disabled>
              Import
            </Button>
            <Button color="gray" onClick={() => setNewModalOpen(true)}>
              New Request
            </Button>
            <Input
              label="Search"
              variant="outlined"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="md:tw-w-64"
            />
          </div>
        </CardHeader>
        <CardBody className="tw-overflow-x-auto tw-p-0">
          <table className="tw-w-full tw-text-left">
            <thead>
              <tr>
                {TABLE_HEADERS.map((header) => (
                  <th key={header} className="tw-px-6 tw-py-4">
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

      <NewRequestModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
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

      <Dialog
        open={Boolean(deleteTarget)}
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
            Permanently remove {deleteTarget?.code} and its items?
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
