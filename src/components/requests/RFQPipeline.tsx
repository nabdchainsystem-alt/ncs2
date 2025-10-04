"use client";

import { useState } from "react";

import {
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
  Textarea,
  Typography,
  Button,
} from "@/components/MaterialTailwind";
import {
  PencilSquareIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

import { useRFQs, useDeleteRFQ } from "@/hooks/requests";

const columns = [
  "QUOTATION NO",
  "REQUEST NO",
  "VENDOR",
  "ITEMS",
  "VALUE (SAR)",
  "STATUS",
  "ACTIONS",
] as const;

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RFQPipeline() {
  const { rows, isLoading, isError, error, mutate } = useRFQs({ page: 1, pageSize: 10, sort: "createdAt:desc" });
  const { deleteRFQ } = useDeleteRFQ();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; quotationNo: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; note: string } | null>(null);
  const [poTarget, setPoTarget] = useState<{ id: string; quotationNo: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={columns.length} className="tw-px-6 tw-py-12 tw-text-center tw-text-blue-gray-400">
            Loading RFQs...
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={columns.length} className="tw-px-6 tw-py-12">
            <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {error instanceof Error ? error.message : "Unable to load RFQs"}
              </Typography>
              <Typography
                as="button"
                variant="small"
                className="tw-text-blue-500 tw-underline"
                onClick={() => mutate()}
              >
                Retry
              </Typography>
            </div>
          </td>
        </tr>
      );
    }

    if (!rows.length) {
      return (
        <tr>
          <td colSpan={columns.length} className="tw-px-6 tw-py-12">
            <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-text-center">
              <Typography variant="h6" color="blue-gray">
                No RFQs yet
              </Typography>
              <Typography
                variant="small"
                className="!tw-font-normal !tw-text-blue-gray-500"
              >
                RFQs will appear once requests move into sourcing.
              </Typography>
            </div>
          </td>
        </tr>
      );
    }

    return rows.map((row) => (
      <tr key={row.id} className="tw-border-t tw-border-blue-gray-50">
        <td className="tw-px-6 tw-py-4 tw-font-medium tw-text-blue-gray-600">{row.quotationNo}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{row.requestCode ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{row.vendorName ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{row.qty.toLocaleString()}</td>
        <td className="tw-px-6 tw-py-4 tw-text-blue-gray-500">{formatCurrency(row.totalIncVat)}</td>
        <td className="tw-px-6 tw-py-4">
          <Chip
            value={row.requestStatus ?? "N/A"}
            variant="ghost"
            className="tw-uppercase"
            color={
              row.requestStatus === "CLOSED"
                ? "green"
                : row.requestStatus === "PENDING"
                ? "amber"
                : row.requestStatus === "CANCELLED"
                ? "red"
                : "blue"
            }
          />
        </td>
        <td className="tw-px-6 tw-py-4">
          <div className="tw-flex tw-items-center tw-gap-2">
            <IconButton
              variant="text"
              color="blue-gray"
              aria-label="Edit RFQ"
              onClick={() => setEditTarget({ id: row.id, note: row.note ?? "" })}
            >
              <PencilSquareIcon className="tw-h-5 tw-w-5" />
            </IconButton>
            <IconButton
              variant="text"
              color="red"
              aria-label="Delete RFQ"
              onClick={() => setDeleteTarget({ id: row.id, quotationNo: row.quotationNo })}
            >
              <TrashIcon className="tw-h-5 tw-w-5" />
            </IconButton>
            <IconButton
              variant="text"
              color="green"
              aria-label="Send PO"
              onClick={() => setPoTarget({ id: row.id, quotationNo: row.quotationNo })}
            >
              <PaperAirplaneIcon className="tw-h-5 tw-w-5" />
            </IconButton>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <>
      <Card className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          className="tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h5" color="blue-gray">
              RFQ Pipeline
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Track vendor quotations across sourcing stages
            </Typography>
          </div>
        </CardHeader>
        <CardBody className="tw-overflow-x-auto tw-p-0">
          <table className="tw-min-w-max tw-w-full tw-table-auto">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                    <Typography
                      variant="small"
                      color="blue-gray"
                      className="tw-text-left tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                    >
                      {column}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </CardBody>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        handler={() => {
          if (isDeleting) return;
          setDeleteError(null);
          setDeleteTarget(null);
        }}
        size="sm"
      >
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Delete RFQ
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Are you sure you want to delete {deleteTarget?.quotationNo}?
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
              if (isDeleting) return;
              setDeleteError(null);
              setDeleteTarget(null);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            color="red"
            disabled={isDeleting || !deleteTarget}
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                setIsDeleting(true);
                setDeleteError(null);
                await deleteRFQ(deleteTarget.id);
                await mutate();
                setDeleteTarget(null);
              } catch (err) {
                if (err instanceof Error) {
                  setDeleteError(err.message);
                } else {
                  setDeleteError("Failed to delete RFQ");
                }
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={Boolean(editTarget)} handler={() => setEditTarget(null)} size="md">
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Edit RFQ Note
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Update the internal note for this quotation.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-4">
          <Textarea
            label="Note"
            variant="outlined"
            rows={4}
            value={editTarget?.note ?? ""}
            onChange={(event) =>
              setEditTarget((prev) => (prev ? { ...prev, note: event.target.value } : prev))
            }
          />
        </DialogBody>
        <DialogFooter className="tw-flex tw-gap-3">
          <Button variant="text" color="blue-gray" onClick={() => setEditTarget(null)}>
            Cancel
          </Button>
          <Button color="gray" onClick={() => setEditTarget(null)}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={Boolean(poTarget)} handler={() => setPoTarget(null)} size="sm">
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Send Purchase Order
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            This feature will be available soon.
          </Typography>
        </DialogHeader>
        <DialogBody>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {poTarget?.quotationNo} cannot be sent yet. Please check back later.
          </Typography>
        </DialogBody>
        <DialogFooter className="tw-flex tw-gap-3">
          <Button color="gray" onClick={() => setPoTarget(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
