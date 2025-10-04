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
  Textarea,
  Typography,
  Button,
} from "@/components/data/shared";
import { TableCard, useModalState } from "@/components/data/shared";
import { useMachines, useDepartments } from "@/hooks/data";

const columns = [
  "Machine Name",
  "Machine Code",
  "Department",
  "Status",
  "Actions",
] as const;

const STATUS_OPTIONS = ["Active", "Inactive"] as const;

export default function MachinesTable() {
  const { open, openModal, closeModal } = useModalState();
  const { rows, isLoading, isError, error, mutate } = useMachines({ page: 1, pageSize: 10 });
  const { rows: departments } = useDepartments({ page: 1, pageSize: 100 });

  const [formState, setFormState] = useState({
    name: "",
    code: "",
    departmentId: "",
    status: "Active" as "Active" | "Inactive",
    notes: "",
  });
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const departmentOptions = useMemo(() => {
    return departments.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const resetForm = () => {
    setFormState({ name: "", code: "", departmentId: "", status: "Active", notes: "" });
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
      const departmentId = formState.departmentId ? formState.departmentId : null;
      const notesInput = formState.notes.trim();
      const notesValue = notesInput === "" ? null : notesInput;
      const payload = {
        name: formState.name.trim(),
        code: formState.code.trim(),
        status: formState.status,
        departmentId,
        notes: notesValue,
      };

      const endpoint =
        mode === "create" ? "/api/machines" : `/api/machines/${selectedId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? payload
          : {
              ...(payload.name ? { name: payload.name } : {}),
              ...(payload.code ? { code: payload.code } : {}),
              ...(payload.status ? { status: payload.status } : {}),
              departmentId: payload.departmentId,
              notes: payload.notes,
            };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to save machine");
        return;
      }

      await mutate();
      handleClose();
    } catch (err) {
      console.error("Create machine failed", err);
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
      departmentId: row.departmentId ?? "",
      status: (row.status as "Active" | "Inactive") ?? "Active",
      notes: row.notes ?? "",
    });
    setFormError(null);
    openModal();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/machines/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to delete machine");
        return;
      }

      await mutate();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete machine failed", err);
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
              Loading machines...
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
              {error instanceof Error ? error.message : "Unable to load machines"}
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
            {row.department?.name ?? "—"}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography
            variant="small"
            className={`!tw-font-semibold ${
              row.status === "Active"
                ? "tw-text-green-600"
                : row.status === "Inactive"
                ? "tw-text-blue-gray-400"
                : "tw-text-blue-gray-300"
            }`}
          >
            {row.status}
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
              onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
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
        title="Machines"
        subtitle="Manage machine registry"
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
            {mode === "create" ? "Add Machine" : "Edit Machine"}
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Provide machine details below.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-4">
          <Input
            label="Machine Name"
            variant="outlined"
            value={formState.name}
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Machine Code"
            variant="outlined"
            value={formState.code}
            onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
          />
          <Select
            label="Department"
            variant="outlined"
            value={formState.departmentId}
            onChange={(value) => setFormState((prev) => ({ ...prev, departmentId: value ?? "" }))}
          >
            <Option value="">Unassigned</Option>
            {departmentOptions.map((department) => (
              <Option key={department.id} value={department.id}>
                {department.name}
              </Option>
            ))}
          </Select>
          <Select
            label="Status"
            variant="outlined"
            value={formState.status}
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, status: (value as "Active" | "Inactive") ?? "Active" }))
            }
          >
            {STATUS_OPTIONS.map((status) => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>
          <Textarea
            label="Notes"
            variant="outlined"
            rows={3}
            value={formState.notes}
            onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
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
            Delete Machine
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
