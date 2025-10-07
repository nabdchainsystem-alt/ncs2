"use client";

import { useCallback, useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Chip,
  Alert,
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
import PageSizeSelect from "@/components/common/PageSizeSelect";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  DocumentPlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { useRFQs, useDeleteRFQ } from "@/hooks/requests";
import type { RFQRow } from "@/hooks/requests";
import { useCreatePurchaseOrder } from "@/hooks/orders/usePurchaseOrders";

type SortField =
  | "quotationNo"
  | "requestCode"
  | "vendorName"
  | "itemCode"
  | "itemName"
  | "qty"
  | "unitPrice"
  | "totalIncVat"
  | "requestStatus"
  | "createdAt";

type ColumnConfig = {
  key: string;
  label: string;
  sortField?: SortField;
};

const TABLE_COLUMNS: ColumnConfig[] = [
  { key: "quotationNo", label: "QUOTATION NO", sortField: "quotationNo" },
  { key: "requestCode", label: "REQUEST", sortField: "requestCode" },
  { key: "vendorName", label: "VENDOR", sortField: "vendorName" },
  { key: "itemCode", label: "ITEM CODE", sortField: "itemCode" },
  { key: "itemName", label: "ITEM NAME", sortField: "itemName" },
  { key: "qty", label: "QTY", sortField: "qty" },
  { key: "unitPrice", label: "UNIT PRICE", sortField: "unitPrice" },
  { key: "totalIncVat", label: "VALUE (SAR)", sortField: "totalIncVat" },
  { key: "requestStatus", label: "STATUS", sortField: "requestStatus" },
  { key: "actions", label: "ACTIONS" },
];

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RFQPipeline() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const {
    rows,
    total,
    page: currentPage,
    pageSize: currentPageSize,
    isLoading,
    isError,
    error,
    mutate,
  } = useRFQs({
    page,
    pageSize,
    sort: `${sortField}:${sortDirection}` as const,
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  const { deleteRFQ } = useDeleteRFQ();
  const { create: createPurchaseOrder, isLoading: isCreatingPo } = useCreatePurchaseOrder();
  const totalPages = Math.max(1, Math.ceil(total / (currentPageSize || pageSize)));
  const { mutate: globalMutate } = useSWRConfig();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; quotationNo: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; note: string } | null>(null);
  const [creatingPoId, setCreatingPoId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [poAlert, setPoAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
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

  useEffect(() => {
    if (!poAlert) return;
    const timeout = window.setTimeout(() => setPoAlert(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [poAlert]);

  const handleCreatePo = async (row: RFQRow) => {
    if (!row.vendorId) {
      setPoAlert({ type: "error", message: "RFQ is missing vendor information." });
      return;
    }

    try {
      setCreatingPoId(row.id);
      const payload = {
        rfqId: row.id,
        vendorId: row.vendorId,
        currency: "SAR",
        vatPct: row.vatPct ?? 15,
        items: [
          {
            materialId: row.materialId ?? undefined,
            name: row.itemName ?? row.itemCode ?? row.requestCode ?? row.quotationNo,
            qty: row.qty > 0 ? row.qty : 1,
            unit: "PC" as const,
            unitPrice: row.unitPrice >= 0 ? row.unitPrice : 0,
            note: row.note ?? undefined,
          },
        ],
      };

      const response = await createPurchaseOrder(payload);

      setPoAlert({ type: "success", message: `Purchase Order ${response.poNo} created successfully.` });
      await mutate();
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/purchase-orders"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create purchase order";
      setPoAlert({ type: "error", message });
    } finally {
      setCreatingPoId(null);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={TABLE_COLUMNS.length} className="tw-px-6 tw-py-12 tw-text-center tw-text-blue-gray-400">
            Loading RFQs...
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={TABLE_COLUMNS.length} className="tw-px-6 tw-py-12">
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
          <td colSpan={TABLE_COLUMNS.length} className="tw-px-6 tw-py-12">
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
        <td className="tw-px-6 tw-py-4 tw-text-center tw-font-semibold tw-text-blue-gray-600">{row.quotationNo}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{row.requestCode ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{row.vendorName ?? "Vendor TBD"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{row.itemCode ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-600">{row.itemName ?? "—"}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{row.qty.toLocaleString()}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{formatCurrency(row.unitPrice)}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center tw-text-blue-gray-500">{formatCurrency(row.totalIncVat)}</td>
        <td className="tw-px-6 tw-py-4 tw-text-center">
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
          <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
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
              aria-label="Create Purchase Order"
              disabled={creatingPoId === row.id || isCreatingPo}
              onClick={() => handleCreatePo(row)}
            >
              <DocumentPlusIcon className={`tw-h-5 tw-w-5 ${creatingPoId === row.id ? "tw-animate-pulse" : ""}`} />
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
          className="tw-flex tw-flex-col tw-gap-4 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between"
        >
          <div className="tw-flex tw-flex-col tw-gap-1">
            <Typography variant="h5" color="blue-gray">
              RFQ Pipeline
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Track vendor quotations across sourcing stages
            </Typography>
          </div>
          <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center">
            <PageSizeSelect
              value={pageSize}
              onChange={handlePageSizeChange}
              className="sm:tw-w-36"
              label="Rows per page"
            />
            <Input
              label="Search RFQs"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="sm:tw-w-64"
              crossOrigin="anonymous"
            />
          </div>
        </CardHeader>
        <CardBody className="tw-overflow-x-auto tw-p-0">
          {poAlert ? (
            <Alert color={poAlert.type === "success" ? "green" : "red"} className="tw-mx-6 tw-mt-6">
              {poAlert.message}
            </Alert>
          ) : null}
          <table className="tw-min-w-max tw-w-full tw-table-auto tw-text-center">
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
                  return (
                    <th key={key} className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4" aria-sort={ariaSort}>
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(columnSortField!)}
                          className="tw-inline-flex tw-items-center tw-justify-center tw-gap-1 tw-text-blue-gray-500 focus:tw-outline-none"
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
                          className="tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
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
        <CardFooter className="tw-flex tw-flex-col tw-gap-3 md:tw-flex-row md:tw-items-center md:tw-justify-between">
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
        </CardFooter>
      </Card>

      {deleteTarget ? (
        <Dialog
          open
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
              Are you sure you want to delete {deleteTarget.quotationNo}?
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
              disabled={isDeleting}
              onClick={async () => {
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
      ) : null}

      {editTarget ? (
        <Dialog open handler={() => setEditTarget(null)} size="md">
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
              value={editTarget.note}
              onChange={(event) =>
                setEditTarget((prev) =>
                  prev ? { ...prev, note: event.target.value } : prev
                )
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
      ) : null}
    </>
  );
}
