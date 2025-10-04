"use client";

import { useState } from "react";

import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  Typography,
  Button,
} from "@/components/data/shared";
import { TableCard, useModalState } from "@/components/data/shared";
import { useWarehouses } from "@/hooks/data";

const columns = [
  "Warehouse Name",
  "Warehouse Code",
  "Warehouse Location",
  "Size (m²)",
  "Actions",
] as const;

export default function WarehousesTable() {
  const { open, openModal, closeModal } = useModalState();
  const { rows, isLoading, isError, error, mutate } = useWarehouses({ page: 1, pageSize: 10 });

  const [formState, setFormState] = useState({
    name: "",
    code: "",
    location: "",
    sizeM2: "",
  });
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setFormState({ name: "", code: "", location: "", sizeM2: "" });
    setFormError(null);
    setMode("create");
    setSelectedId(null);
  };

  const handleClose = () => {
    closeModal();
    resetForm();
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      const locationInput = formState.location.trim();
      const normalizedLocation = locationInput === "" ? null : locationInput;
      const sizeInput = formState.sizeM2.trim();
      const parsedSize = sizeInput === "" ? null : Number(sizeInput);

      if (sizeInput !== "" && Number.isNaN(parsedSize)) {
        setFormError("Size must be a number");
        return;
      }

      const payload = {
        name: formState.name.trim(),
        code: formState.code.trim(),
        location: normalizedLocation,
        sizeM2: parsedSize,
      };

      const endpoint =
        mode === "create"
          ? "/api/warehouses"
          : `/api/warehouses/${selectedId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const body =
        mode === "create"
          ? payload
          : {
              ...(payload.name ? { name: payload.name } : {}),
              ...(payload.code ? { code: payload.code } : {}),
              location: payload.location,
              sizeM2: payload.sizeM2,
            };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to save warehouse");
        return;
      }

      await mutate();
      handleClose();
    } catch (err) {
      console.error("Create warehouse failed", err);
      setFormError("Unexpected error while saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    openModal();
  };

  const openEditModal = (row: typeof rows[number]) => {
    setMode("edit");
    setSelectedId(row.id);
    setFormState({
      name: row.name,
      code: row.code,
      location: row.location ?? "",
      sizeM2: row.sizeM2?.toString() ?? "",
    });
    setFormError(null);
    openModal();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const response = await fetch(`/api/warehouses/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message ?? "Failed to delete warehouse");
        return;
      }

      await mutate();
      setDeleteTarget(null);
      setDeleteError(null);
    } catch (err) {
      console.error("Delete warehouse failed", err);
      setDeleteError("Unexpected error while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={columns.length} className="tw-px-6 tw-py-12">
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400 tw-text-center">
              Loading warehouses...
            </Typography>
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={columns.length} className="tw-px-6 tw-py-12">
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500 tw-text-center">
              {error instanceof Error ? error.message : "Unable to load warehouses"}
            </Typography>
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
                No records yet
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                Add a new entry to populate this list.
              </Typography>
            </div>
          </td>
        </tr>
      );
    }

    return rows.map((row) => (
      <tr key={row.id}>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-600">
            {row.name}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-500">
            {row.code}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.location ?? "—"}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.sizeM2 ?? "—"}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <div className="tw-flex tw-gap-2">
            <Button
              size="sm"
              variant="text"
              color="blue-gray"
              onClick={() => openEditModal(row)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="text"
              color="red"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget({ id: row.id, name: row.name });
              }}
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <>
      <TableCard
        title="Warehouses"
        subtitle="Manage and add new warehouses"
        onAddNew={openCreateModal}
      >
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
      </TableCard>

      <Dialog open={open} handler={handleClose} size="md">
        <DialogHeader className="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            {mode === "create" ? "Add Warehouse" : "Edit Warehouse"}
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Provide warehouse details below.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-4">
          <Input
            label="Warehouse Name"
            variant="outlined"
            value={formState.name}
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Warehouse Code"
            variant="outlined"
            value={formState.code}
            onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
          />
          <Input
            label="Warehouse Location"
            variant="outlined"
            value={formState.location}
            onChange={(e) => setFormState((prev) => ({ ...prev, location: e.target.value }))}
          />
          <Input
            type="number"
            label="Size in meters"
            variant="outlined"
            value={formState.sizeM2}
            onChange={(e) => setFormState((prev) => ({ ...prev, sizeM2: e.target.value }))}
          />
          {formError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {formError}
            </Typography>
          ) : null}
        </DialogBody>
        <DialogFooter className="tw-flex tw-gap-3">
          <Button variant="text" color="blue-gray" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button color="gray" onClick={handleSubmit} disabled={isSubmitting}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>

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
            Delete Warehouse
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Are you sure you want to delete {deleteTarget?.name}?
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
          <Button color="red" onClick={handleDelete} disabled={isDeleting}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
