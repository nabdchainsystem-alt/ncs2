"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  IconButton,
  Input,
  Menu,
  MenuHandler,
  MenuItem,
  MenuList,
  Typography,
} from "@/components/MaterialTailwind";
import { EllipsisHorizontalIcon, PencilSquareIcon, EyeIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

import VendorProfileDrawer from "./VendorProfileDrawer";
import type { VendorFilters } from "./VendorFiltersBar";
import { useVendors, type VendorListRow } from "@/hooks/vendors";

const TABLE_HEADERS = ["Name", "Category", "Contact", "Phone", "Email", "Status", "Actions"] as const;

const STATUS_COLORS: Record<string, "green" | "blue-gray" | "amber"> = {
  Active: "green",
  Inactive: "blue-gray",
};

type EditFormState = {
  nameEn: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
};

type Props = {
  filters: VendorFilters;
};

const initialEditState: EditFormState = {
  nameEn: "",
  email: "",
  phone: "",
  status: "Active",
};

export default function VendorsTable({ filters }: Props) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort] = useState("nameEn:asc");
  const [drawerVendorId, setDrawerVendorId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VendorListRow | null>(null);
  const [editState, setEditState] = useState<EditFormState>(initialEditState);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const apiFilters = useMemo(() => {
    const status =
      filters.status === "all"
        ? undefined
        : filters.status === "active"
        ? "Active"
        : "Inactive";

    return {
      page,
      pageSize,
      sort,
      ...(filters.search ? { search: filters.search } : {}),
      ...(status ? { status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    };
  }, [filters, page, pageSize, sort]);

  const { data, isLoading, isError, error, mutate } = useVendors(apiFilters);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.category]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetEditState = () => {
    setEditState(initialEditState);
    setEditTarget(null);
    setEditError(null);
  };

  const handleOpenDrawer = (vendor: VendorListRow) => {
    setDrawerVendorId(vendor.id);
    setIsDrawerOpen(true);
  };

  const openEditDialog = (vendor: VendorListRow) => {
    setEditTarget(vendor);
    setEditState({
      nameEn: vendor.nameEn,
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      status: vendor.status === "Inactive" ? "Inactive" : "Active",
    });
    setEditError(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget) return;
    try {
      setIsSaving(true);
      setEditError(null);
      const response = await fetch(`/api/vendors/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn: editState.nameEn,
          email: editState.email || null,
          phone: editState.phone || null,
          status: editState.status,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setEditError(payload.message ?? "Unable to update vendor");
        return;
      }

      await mutate();
      resetEditState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setEditError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (vendor: VendorListRow) => {
    try {
      setStatusError(null);
      const nextStatus = vendor.status === "Active" ? "Inactive" : "Active";
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setStatusError(payload.message ?? "Unable to update status");
        return;
      }

      await mutate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setStatusError(message);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-10 tw-text-center tw-text-blue-gray-400" colSpan={TABLE_HEADERS.length}>
            Loading vendors…
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-10" colSpan={TABLE_HEADERS.length}>
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {error instanceof Error ? error.message : "Unable to load vendors"}
            </Typography>
          </td>
        </tr>
      );
    }

    if (!rows.length) {
      return (
        <tr>
          <td className="tw-px-6 tw-py-10 tw-text-center tw-text-blue-gray-400" colSpan={TABLE_HEADERS.length}>
            No vendors match the current filters.
          </td>
        </tr>
      );
    }

    return rows.map((row) => (
      <tr key={row.id} className="tw-border-b tw-border-blue-gray-50 last:tw-border-0">
        <td className="tw-px-4 tw-py-3">
          <div className="tw-flex tw-flex-col">
            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
              {row.nameEn}
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              Joined {new Date(row.createdAt).toLocaleDateString()}
            </Typography>
          </div>
        </td>
        <td className="tw-px-4 tw-py-3">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.category}
          </Typography>
        </td>
        <td className="tw-px-4 tw-py-3">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.contactPerson ?? "—"}
          </Typography>
        </td>
        <td className="tw-px-4 tw-py-3">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.phone ?? "—"}
          </Typography>
        </td>
        <td className="tw-px-4 tw-py-3">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.email ?? "—"}
          </Typography>
        </td>
        <td className="tw-px-4 tw-py-3">
          <Chip
            value={row.status ?? "Unknown"}
            color={STATUS_COLORS[row.status ?? ""] ?? "blue-gray"}
            variant="ghost"
            className="tw-uppercase"
          />
        </td>
        <td className="tw-px-4 tw-py-3">
          <Menu placement="bottom-end">
            <MenuHandler>
              <IconButton variant="text" color="blue-gray">
                <EllipsisHorizontalIcon className="tw-h-5 tw-w-5" />
              </IconButton>
            </MenuHandler>
            <MenuList>
              <MenuItem onClick={() => handleOpenDrawer(row)}>
                <EyeIcon className="tw-mr-2 tw-h-4 tw-w-4" /> View profile
              </MenuItem>
              <MenuItem onClick={() => openEditDialog(row)}>
                <PencilSquareIcon className="tw-mr-2 tw-h-4 tw-w-4" /> Edit details
              </MenuItem>
              <MenuItem onClick={() => toggleStatus(row)}>
                <ArrowsRightLeftIcon className="tw-mr-2 tw-h-4 tw-w-4" />
                {row.status === "Active" ? "Deactivate" : "Activate"}
              </MenuItem>
            </MenuList>
          </Menu>
        </td>
      </tr>
    ));
  };

  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <>
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-2 md:tw-flex-row md:tw-items-baseline md:tw-justify-between">
          <div>
            <Typography variant="h6" color="blue-gray">
              Vendors
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Server-side search, sorting, and quick actions
            </Typography>
          </div>
        </CardHeader>
        <CardBody className="tw-overflow-x-auto tw-p-0">
          <table className="tw-min-w-full tw-table-auto">
            <thead>
              <tr className="tw-border-b tw-border-blue-gray-50">
                {TABLE_HEADERS.map((header) => (
                  <th key={header} className="tw-px-4 tw-py-3 tw-text-left">
                    <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                      {header}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </CardBody>
        <CardFooter className="tw-flex tw-flex-col tw-gap-3 md:tw-flex-row md:tw-items-center md:tw-justify-between">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Showing page {page} of {totalPages} (total {total} vendors)
          </Typography>
          <div className="tw-flex tw-items-center tw-gap-2">
            <Button variant="outlined" color="gray" size="sm" onClick={handlePrevPage} disabled={page === 1}>
              Previous
            </Button>
            <Button
              variant="outlined"
              color="gray"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {statusError ? (
        <Alert color="red" className="tw-mt-4">
          {statusError}
        </Alert>
      ) : null}

      <VendorProfileDrawer
        vendorId={drawerVendorId}
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerVendorId(null);
        }}
      />

      <Dialog open={Boolean(editTarget)} handler={resetEditState} size="sm">
        <DialogHeader>Edit vendor</DialogHeader>
        <form onSubmit={handleEditSubmit}>
          <DialogBody className="tw-space-y-4">
            {editError ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {editError}
              </Typography>
            ) : null}
            <Input
              label="Vendor name"
              value={editState.nameEn}
              onChange={(event) => setEditState((prev) => ({ ...prev, nameEn: event.target.value }))}
              crossOrigin="anonymous"
              required
            />
            <Input
              label="Email"
              value={editState.email}
              onChange={(event) => setEditState((prev) => ({ ...prev, email: event.target.value }))}
              crossOrigin="anonymous"
              type="email"
            />
            <Input
              label="Phone"
              value={editState.phone}
              onChange={(event) => setEditState((prev) => ({ ...prev, phone: event.target.value }))}
              crossOrigin="anonymous"
            />
            <div className="tw-flex tw-items-center tw-gap-3">
              <Button
                size="sm"
                variant={editState.status === "Active" ? "filled" : "outlined"}
                color="green"
                onClick={() => setEditState((prev) => ({ ...prev, status: "Active" }))}
                type="button"
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={editState.status === "Inactive" ? "filled" : "outlined"}
                color="gray"
                onClick={() => setEditState((prev) => ({ ...prev, status: "Inactive" }))}
                type="button"
              >
                Inactive
              </Button>
            </div>
          </DialogBody>
          <DialogFooter className="tw-space-x-2">
            <Button variant="text" color="gray" onClick={resetEditState}>
              Cancel
            </Button>
            <Button color="blue" type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
