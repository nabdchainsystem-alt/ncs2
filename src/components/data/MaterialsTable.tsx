"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  Option,
  Select,
  Typography,
  Button,
} from "@/components/data/shared";
import { TableCard, useModalState } from "@/components/data/shared";
import { useMaterials, useWarehouses } from "@/hooks/data";

const columns = [
  "Item Code",
  "Item Name",
  "Unit",
  "Category",
  "Warehouse",
  "Actions",
] as const;

const UNIT_OPTIONS = ["PC", "KG", "L", "Carton", "Pallet"] as const;
const CATEGORY_OPTIONS = [
  "Raw Material Preform",
  "Raw Material Cap",
  "Raw Material Label",
  "Raw Material Carton",
  "Finished Goods",
  "Spare Parts",
] as const;

export default function MaterialsTable() {
  const { open, openModal, closeModal } = useModalState();
  const { rows, isLoading, isError, error, mutate } = useMaterials({ page: 1, pageSize: 10 });
  const {
    rows: warehouseOptions,
    isLoading: isWarehousesLoading,
  } = useWarehouses({ page: 1, pageSize: 100 });

  const [formState, setFormState] = useState({
    code: "",
    name: "",
    unit: "",
    category: "",
    warehouseId: "",
  });
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedWarehouseOptions = useMemo(() => {
    return warehouseOptions.slice().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [warehouseOptions]);

  const resetForm = () => {
    setFormState({ code: "", name: "", unit: "", category: "", warehouseId: "" });
    setFormError(null);
    setSelectedId(null);
    setMode("create");
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
      const payload = {
        code: formState.code.trim(),
        name: formState.name.trim(),
        unit: formState.unit as typeof UNIT_OPTIONS[number],
        category: formState.category.trim(),
        warehouseId: formState.warehouseId ? formState.warehouseId : null,
      };

      const endpoint =
        mode === "create"
          ? "/api/materials"
          : `/api/materials/${selectedId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? payload
          : {
              ...(payload.code ? { code: payload.code } : {}),
              ...(payload.name ? { name: payload.name } : {}),
              ...(payload.unit ? { unit: payload.unit } : {}),
              ...(payload.category ? { category: payload.category } : {}),
              warehouseId: payload.warehouseId,
            };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to save material");
        return;
      }

      await mutate();
      handleClose();
    } catch (err) {
      console.error("Create material failed", err);
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
      code: row.code,
      name: row.name,
      unit: row.unit,
      category: row.category,
      warehouseId: row.warehouseId ?? "",
    });
    setFormError(null);
    openModal();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/materials/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to delete material");
        return;
      }

      await mutate();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete material failed", err);
      setFormError("Unexpected error while deleting");
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
              Loading materials...
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
              {error instanceof Error ? error.message : "Unable to load materials"}
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
            {row.code}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-600">
            {row.name}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.unit}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.category}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.warehouse?.name ?? "—"}
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
        title="Materials"
        subtitle="Manage material catalog"
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
            {mode === "create" ? "Add Material" : "Edit Material"}
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Provide material details below.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-4">
          <Input
            label="Item Code"
            variant="outlined"
            value={formState.code}
            onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
          />
          <Input
            label="Item Name"
            variant="outlined"
            value={formState.name}
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Select
            label="Unit"
            variant="outlined"
            value={formState.unit}
            onChange={(value) => setFormState((prev) => ({ ...prev, unit: value ?? "" }))}
          >
            {UNIT_OPTIONS.map((unit) => (
              <Option key={unit} value={unit}>
                {unit}
              </Option>
            ))}
          </Select>
          <Select
            label="Category"
            variant="outlined"
            value={formState.category}
            onChange={(value) => setFormState((prev) => ({ ...prev, category: value ?? "" }))}
          >
            {CATEGORY_OPTIONS.map((category) => (
              <Option key={category} value={category}>
                {category}
              </Option>
            ))}
          </Select>
          <Select
            label="Warehouse"
            variant="outlined"
            value={formState.warehouseId}
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, warehouseId: value ? String(value) : "" }))
            }
            disabled={isWarehousesLoading || !sortedWarehouseOptions.length}
          >
            <Option value="">Unassigned</Option>
            {sortedWarehouseOptions.map((warehouse) => (
              <Option key={warehouse.id} value={warehouse.id}>
                {warehouse.name ?? warehouse.code}
              </Option>
            ))}
          </Select>
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
            Delete Material
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
