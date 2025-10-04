"use client";

import { useState } from "react";

import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  Select,
  Option,
  Switch,
  Typography,
  Textarea,
  Button,
} from "@/components/data/shared";
import { TableCard, useModalState } from "@/components/data/shared";
import { useVendors } from "@/hooks/data";

const columns = [
  "Vendor Name",
  "Category",
  "Contact Person",
  "Phone",
  "Email",
  "Status",
  "Actions",
] as const;

const VENDOR_CATEGORIES = [
  "Raw Materials",
  "Packaging",
  "Logistics",
  "Services",
  "Maintenance",
] as const;

export default function VendorsTable() {
  const { open, openModal, closeModal } = useModalState();
  const { rows, isLoading, isError, error, mutate } = useVendors({ page: 1, pageSize: 10 });

  const [formState, setFormState] = useState({
    nameEn: "",
    category: "",
    subCategory: "",
    contactPerson: "",
    position: "",
    phone: "",
    email: "",
    website: "",
    companyNumber: "",
    address: "",
    status: "Active" as "Active" | "Inactive",
    cr: "",
    crExpiry: "",
    vat: "",
    vatExpiry: "",
    bank: "",
    iban: "",
    nameAr: "",
  });
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setFormState({
      nameEn: "",
      category: "",
      subCategory: "",
      contactPerson: "",
      position: "",
      phone: "",
      email: "",
      website: "",
      companyNumber: "",
      address: "",
      status: "Active",
      cr: "",
      crExpiry: "",
      vat: "",
      vatExpiry: "",
      bank: "",
      iban: "",
      nameAr: "",
    });
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

      const payload = {
        nameEn: formState.nameEn.trim(),
        category: formState.category.trim(),
        subCategory: formState.subCategory.trim() || undefined,
        contactPerson: formState.contactPerson.trim() || undefined,
        position: formState.position.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        email: formState.email.trim() || undefined,
        website: formState.website.trim() || undefined,
        companyNumber: formState.companyNumber.trim() || undefined,
        address: formState.address.trim() || undefined,
        status: formState.status,
        cr: formState.cr.trim() || undefined,
        crExpiry: formState.crExpiry || undefined,
        vat: formState.vat.trim() || undefined,
        vatExpiry: formState.vatExpiry || undefined,
        bank: formState.bank.trim() || undefined,
        iban: formState.iban.trim() || undefined,
        nameAr: formState.nameAr.trim() || undefined,
      };

      const endpoint =
        mode === "create" ? "/api/vendors" : `/api/vendors/${selectedId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const body =
        mode === "create"
          ? payload
          : Object.fromEntries(
              Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")
            );

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to save vendor");
        return;
      }

      await mutate();
      handleClose();
    } catch (err) {
      console.error("Create vendor failed", err);
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
      nameEn: row.nameEn,
      nameAr: row.nameAr ?? "",
      category: row.category,
      subCategory: row.subCategory ?? "",
      contactPerson: row.contactPerson ?? "",
      position: row.position ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      website: row.website ?? "",
      companyNumber: row.companyNumber ?? "",
      address: row.address ?? "",
      status: (row.status as "Active" | "Inactive") || "Active",
      cr: row.cr ?? "",
      crExpiry: row.crExpiry ? row.crExpiry.slice(0, 10) : "",
      vat: row.vat ?? "",
      vatExpiry: row.vatExpiry ? row.vatExpiry.slice(0, 10) : "",
      bank: row.bank ?? "",
      iban: row.iban ?? "",
    });
    setFormError(null);
    openModal();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const response = await fetch(`/api/vendors/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message ?? "Failed to delete vendor");
        return;
      }

      await mutate();
      setDeleteTarget(null);
      setDeleteError(null);
    } catch (err) {
      console.error("Delete vendor failed", err);
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
              Loading vendors...
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
              {error instanceof Error ? error.message : "Unable to load vendors"}
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
            {row.nameEn}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.category}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.contactPerson ?? "—"}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.phone ?? "—"}
          </Typography>
        </td>
        <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {row.email ?? "—"}
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
            {row.status ?? "—"}
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
                setDeleteTarget({ id: row.id, name: row.nameEn });
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
        title="Vendors"
        subtitle="Manage vendor partners"
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

      <Dialog open={open} handler={handleClose} size="xl">
        <DialogHeader className="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            {mode === "create" ? "Add Vendor" : "Edit Vendor"}
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Provide vendor details below.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
          <Input
            label="Vendor Name (EN)"
            variant="outlined"
            value={formState.nameEn}
            onChange={(e) => setFormState((prev) => ({ ...prev, nameEn: e.target.value }))}
          />
          <Input
            label="Vendor Name (AR)"
            variant="outlined"
            value={formState.nameAr}
            onChange={(e) => setFormState((prev) => ({ ...prev, nameAr: e.target.value }))}
          />
          <Select
            label="Category"
            variant="outlined"
            value={formState.category}
            onChange={(value) => setFormState((prev) => ({ ...prev, category: value ?? "" }))}
          >
            {VENDOR_CATEGORIES.map((category) => (
              <Option key={category} value={category}>
                {category}
              </Option>
            ))}
          </Select>
          <Input
          label="Subcategory"
          variant="outlined"
          value={formState.subCategory}
          onChange={(e) => setFormState((prev) => ({ ...prev, subCategory: e.target.value }))}
        />
          <Input
            label="Contact Person"
            variant="outlined"
            value={formState.contactPerson}
            onChange={(e) => setFormState((prev) => ({ ...prev, contactPerson: e.target.value }))}
          />
          <Input
            label="Position"
            variant="outlined"
            value={formState.position}
            onChange={(e) => setFormState((prev) => ({ ...prev, position: e.target.value }))}
          />
          <Input
            label="Phone"
            variant="outlined"
            value={formState.phone}
            onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <Input
            label="Email"
            variant="outlined"
            value={formState.email}
            onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Website"
            variant="outlined"
            value={formState.website}
            onChange={(e) => setFormState((prev) => ({ ...prev, website: e.target.value }))}
          />
          <Input
            label="Company Number"
            variant="outlined"
            value={formState.companyNumber}
            onChange={(e) => setFormState((prev) => ({ ...prev, companyNumber: e.target.value }))}
          />
          <Input
            label="Address"
            variant="outlined"
            value={formState.address}
            onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
          />
          <div className="tw-flex tw-items-center tw-gap-3">
          <Switch
            id="vendor-status-switch"
            checked={formState.status === "Active"}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, status: event.target.checked ? "Active" : "Inactive" }))
            }
            label={formState.status === "Active" ? "Active" : "Inactive"}
            color="gray"
          />
          </div>
          <Input
            label="CR No."
            variant="outlined"
            value={formState.cr}
            onChange={(e) => setFormState((prev) => ({ ...prev, cr: e.target.value }))}
          />
          <Input
            type="date"
            label="CR Expiry"
            variant="outlined"
            value={formState.crExpiry}
            onChange={(e) => setFormState((prev) => ({ ...prev, crExpiry: e.target.value }))}
          />
          <Input
            label="VAT No."
            variant="outlined"
            value={formState.vat}
            onChange={(e) => setFormState((prev) => ({ ...prev, vat: e.target.value }))}
          />
          <Input
            type="date"
            label="VAT Expiry"
            variant="outlined"
            value={formState.vatExpiry}
            onChange={(e) => setFormState((prev) => ({ ...prev, vatExpiry: e.target.value }))}
          />
          <Input
            label="Bank"
            variant="outlined"
            value={formState.bank}
            onChange={(e) => setFormState((prev) => ({ ...prev, bank: e.target.value }))}
          />
          <Input
            label="IBAN"
            variant="outlined"
            value={formState.iban}
            onChange={(e) => setFormState((prev) => ({ ...prev, iban: e.target.value }))}
          />
          {formError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500 md:tw-col-span-2">
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
            Delete Vendor
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
