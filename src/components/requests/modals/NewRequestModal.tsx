"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
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
  Textarea,
  Typography,
} from "@/components/MaterialTailwind";
import {
  useCreateRequest,
  useDepartmentsOptions,
  useWarehousesOptions,
  useMachinesOptions,
  useVendorsOptions,
  useMaterialsOptions,
} from "@/hooks/requests";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"] as const;
const UNIT_OPTIONS = ["PC", "KG", "L", "Carton", "Pallet"] as const;
const BASE_REQUEST_CODE = 20251;

type ItemRow = {
  id: string;
  materialId: string;
  name: string;
  qty: string;
  unit: string;
  note: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const createEmptyItem = (): ItemRow => ({
  id: `${Date.now()}-${Math.random()}`,
  materialId: "",
  name: "",
  qty: "1",
  unit: UNIT_OPTIONS[0],
  note: "",
});

export default function NewRequestModal({ open, onClose, onCreated }: Props) {
  const [formState, setFormState] = useState({
    code: "",
    departmentId: "",
    departmentLabel: "",
    warehouseId: "",
    warehouseLabel: "",
    machineId: "",
    machineLabel: "",
    vendorId: "",
    vendorLabel: "",
    priority: "" as string,
    neededBy: "",
    description: "",
  });
  const [items, setItems] = useState<ItemRow[]>([createEmptyItem()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const {
    options: departmentOptions,
    isLoading: isDepartmentsLoading,
    refresh: refreshDepartments,
  } = useDepartmentsOptions();
  const {
    options: warehouseOptions,
    isLoading: isWarehousesLoading,
    refresh: refreshWarehouses,
  } = useWarehousesOptions();
  const {
    options: machineOptions,
    isLoading: isMachinesLoading,
    refresh: refreshMachines,
  } = useMachinesOptions();
  const {
    options: vendorOptions,
    isLoading: isVendorsLoading,
    refresh: refreshVendors,
  } = useVendorsOptions();
  const {
    options: materialOptions,
    isLoading: isMaterialsLoading,
    refresh: refreshMaterials,
  } = useMaterialsOptions();
  const { createRequest, isLoading, error, setError } = useCreateRequest();

  const resetForm = useCallback(() => {
    setFormState({
      code: "",
      departmentId: "",
      departmentLabel: "",
      warehouseId: "",
      warehouseLabel: "",
      machineId: "",
      machineLabel: "",
      vendorId: "",
      vendorLabel: "",
      priority: "",
      neededBy: "",
      description: "",
    });
    setItems([createEmptyItem()]);
    setFormError(null);
    setItemsError(null);
    setError(null);
  }, [setError]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    refreshDepartments();
    refreshWarehouses();
    refreshMachines();
    refreshVendors();
    refreshMaterials();
  }, [open, resetForm, refreshDepartments, refreshMachines, refreshMaterials, refreshVendors, refreshWarehouses]);

  const handleItemChange = (id: string, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleMaterialSelect = (id: string, materialId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const matched = materialOptions.find((option) => option.value === materialId);
        return {
          ...item,
          materialId,
          unit: matched?.unit ?? item.unit,
        };
      })
    );
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeItemRow = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const generateNextCode = useCallback(async () => {
    setIsGeneratingCode(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "50", sort: "createdAt:desc" });
      const response = await fetch(`/api/requests?${params.toString()}`, { cache: "no-store" });

      if (!response.ok) {
        return `REQ-${BASE_REQUEST_CODE}`;
      }

      const json = await response.json().catch(() => null);
      const rows: Array<{ code?: string }> = Array.isArray(json?.rows) ? json.rows : [];

      let maxSerial = BASE_REQUEST_CODE - 1;
      for (const row of rows) {
        if (!row || typeof row.code !== "string") continue;
        const match = row.code.match(/^REQ-(\d+)$/);
        if (!match) continue;
        const numeric = Number.parseInt(match[1], 10);
        if (!Number.isNaN(numeric)) {
          maxSerial = Math.max(maxSerial, numeric);
        }
      }

      const nextNumber = maxSerial >= BASE_REQUEST_CODE - 1 ? maxSerial + 1 : BASE_REQUEST_CODE;
      return `REQ-${nextNumber}`;
    } catch (error) {
      console.error("Failed to fetch next request code", error);
      return `REQ-${BASE_REQUEST_CODE}`;
    } finally {
      setIsGeneratingCode(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (formState.code) return;

    let cancelled = false;

    (async () => {
      const generated = await generateNextCode();
      if (!cancelled) {
        setFormState((prev) => ({ ...prev, code: generated }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, formState.code, generateNextCode]);

  const handleGenerateCode = useCallback(async () => {
    try {
      setFormError(null);
      const next = await generateNextCode();
      setFormState((prev) => ({ ...prev, code: next }));
    } catch (err) {
      console.error("Generate code failed", err);
      setFormError("Unable to generate request number. Please try again.");
    }
  }, [generateNextCode]);

  const handleSubmit = async () => {
    setFormError(null);
    setItemsError(null);
    setError(null);

    if (!formState.priority) {
      setFormError("Priority is required");
      return;
    }

    const parsedItems: Array<{
      materialId?: string | null;
      name?: string | null;
      qty: number;
      unit: string;
      note?: string | null;
    }> = [];

    for (const item of items) {
      const qtyNumber = Number(item.qty);
      if (Number.isNaN(qtyNumber) || qtyNumber <= 0) {
        setItemsError("Quantity must be a positive number for all items.");
        return;
      }

      const hasMaterial = item.materialId && item.materialId.length > 0;
      const nameText = item.name.trim();

      if (!hasMaterial && !nameText) {
        setItemsError("Each item requires selecting a material or providing a name.");
        return;
      }

      parsedItems.push({
        materialId: hasMaterial ? item.materialId : undefined,
        name: hasMaterial ? undefined : nameText,
        qty: qtyNumber,
        unit: item.unit,
        note: item.note.trim() ? item.note.trim() : undefined,
      });
    }

    let code = formState.code.trim();

    if (!code) {
      try {
        const generated = await generateNextCode();
        code = generated;
        setFormState((prev) => ({ ...prev, code: generated }));
      } catch (err) {
        console.error("Auto-generate code failed", err);
        setFormError("Unable to generate request number. Please try again.");
        return;
      }
    }

    try {
      const payload = {
        code,
        departmentId: formState.departmentId || null,
        warehouseId: formState.warehouseId || null,
        machineId: formState.machineId || null,
        vendorId: formState.vendorId || null,
        priority: formState.priority as typeof PRIORITY_OPTIONS[number],
        neededBy: formState.neededBy ? new Date(formState.neededBy).toISOString() : null,
        description: formState.description.trim() || null,
        items: parsedItems,
      };

      await createRequest(payload);
      onCreated();
      resetForm();
      onClose();
    } catch (err) {
      // Error handled via hook state.
    }
  };

  const materialSelectOptions = useMemo(
    () => (
      <>
        <Option value="">Custom item</Option>
        {materialOptions.map((option) => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </>
    ),
    [materialOptions]
  );

  const isAssociationsLoading =
    isDepartmentsLoading || isWarehousesLoading || isMachinesLoading || isVendorsLoading;

  return (
    <Dialog open={open} handler={onClose} size="xl" className="tw-max-h-[90vh]">
      <DialogHeader className="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
        <Typography variant="h5" color="blue-gray">
          New Request
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          Capture the details needed to initiate procurement.
        </Typography>
      </DialogHeader>
      <DialogBody className="tw-space-y-6 tw-overflow-y-auto">
        {formError ? (
          <Alert color="red">{formError}</Alert>
        ) : null}
        {error ? (
          <Alert color="red">{error}</Alert>
        ) : null}
        {itemsError ? (
          <Alert color="red">{itemsError}</Alert>
        ) : null}

        <Card className="tw-border tw-border-blue-gray-50 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-1 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
          >
            <Typography variant="h6" color="blue-gray">
              Request Associations
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Link the request to the right teams, vendors, and assets.
            </Typography>
          </CardHeader>
          <CardBody className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
            <Select
              label="Department"
              variant="outlined"
              value={formState.departmentId}
              selected={(element) =>
                formState.departmentLabel || element?.props.children || ""
              }
              onChange={(value) => {
                const nextValue = value ?? "";
                const option = departmentOptions.find((item) => item.value === nextValue);
                setFormState((prev) => ({
                  ...prev,
                  departmentId: nextValue,
                  departmentLabel: option ? (option.code ? `${option.label} (${option.code})` : option.label) : "",
                }));
              }}
              disabled={isAssociationsLoading}
            >
              <Option value="">Unassigned</Option>
              {departmentOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.code ? `${option.label} (${option.code})` : option.label}
                </Option>
              ))}
            </Select>
            <Select
              label="Warehouse"
              variant="outlined"
              value={formState.warehouseId}
              selected={(element) =>
                formState.warehouseLabel || element?.props.children || ""
              }
              onChange={(value) => {
                const nextValue = value ?? "";
                const option = warehouseOptions.find((item) => item.value === nextValue);
                setFormState((prev) => ({
                  ...prev,
                  warehouseId: nextValue,
                  warehouseLabel: option ? (option.code ? `${option.label} (${option.code})` : option.label) : "",
                }));
              }}
              disabled={isAssociationsLoading}
            >
              <Option value="">Unassigned</Option>
              {warehouseOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.code ? `${option.label} (${option.code})` : option.label}
                </Option>
              ))}
            </Select>
            <Select
              label="Machine"
              variant="outlined"
              value={formState.machineId}
              selected={(element) =>
                formState.machineLabel || element?.props.children || ""
              }
              onChange={(value) => {
                const nextValue = value ?? "";
                const option = machineOptions.find((item) => item.value === nextValue);
                setFormState((prev) => ({
                  ...prev,
                  machineId: nextValue,
                  machineLabel: option ? (option.code ? `${option.label} (${option.code})` : option.label) : "",
                }));
              }}
              disabled={isAssociationsLoading}
            >
              <Option value="">Unassigned</Option>
              {machineOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.code ? `${option.label} (${option.code})` : option.label}
                </Option>
              ))}
            </Select>
            <Select
              label="Vendor"
              variant="outlined"
              value={formState.vendorId}
              selected={(element) =>
                formState.vendorLabel || element?.props.children || ""
              }
              onChange={(value) => {
                const nextValue = value ?? "";
                const option = vendorOptions.find((item) => item.value === nextValue);
                setFormState((prev) => ({
                  ...prev,
                  vendorId: nextValue,
                  vendorLabel: option ? (option.category ? `${option.label} · ${option.category}` : option.label) : "",
                }));
              }}
              disabled={isAssociationsLoading}
            >
              <Option value="">Unassigned</Option>
              {vendorOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.category ? `${option.label} · ${option.category}` : option.label}
                </Option>
              ))}
            </Select>
          </CardBody>
        </Card>

        <Card className="tw-border tw-border-blue-gray-50 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-1 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
          >
            <Typography variant="h6" color="blue-gray">
              Request Details
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Set urgency, timelines, and provide supporting context.
            </Typography>
          </CardHeader>
          <CardBody className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
            <div className="md:tw-col-span-2 tw-grid tw-grid-cols-[minmax(0,1fr)_auto] tw-gap-3 tw-items-end">
              <Input
                label="Request Number"
                variant="outlined"
                value={formState.code}
                onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="Enter or generate"
                disabled={isLoading || isGeneratingCode}
              />
              <Button
                color="gray"
                variant="outlined"
                onClick={handleGenerateCode}
                disabled={isGeneratingCode || isLoading}
              >
                {isGeneratingCode ? "Generating..." : "Generate"}
              </Button>
            </div>
            <Select
              label="Priority"
              variant="outlined"
              value={formState.priority}
              onChange={(value) => setFormState((prev) => ({ ...prev, priority: value ?? "" }))}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <Option key={option} value={option}>
                  <div className="tw-flex tw-items-center tw-justify-between">
                    <span className="tw-font-medium tw-text-blue-gray-700">{option}</span>
                    <Chip
                      value={option}
                      color={option === "Urgent" ? "red" : option === "High" ? "amber" : option === "Low" ? "green" : "blue"}
                      variant="ghost"
                      className="tw-capitalize"
                    />
                  </div>
                </Option>
              ))}
            </Select>
            <Input
              type="date"
              label="Needed by"
              variant="outlined"
              value={formState.neededBy}
              onChange={(event) => setFormState((prev) => ({ ...prev, neededBy: event.target.value }))}
            />
            <Textarea
              label="Description"
              variant="outlined"
              rows={4}
              className="md:tw-col-span-2"
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            />
          </CardBody>
        </Card>

        <Card className="tw-border tw-border-blue-gray-50 tw-shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            className="tw-flex tw-flex-col tw-gap-4 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6 md:tw-flex-row md:tw-items-center md:tw-justify-between"
          >
            <div className="tw-flex tw-flex-col tw-gap-1">
              <Typography variant="h6" color="blue-gray">
                Line Items
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                Specify the materials or custom descriptions included in this request.
              </Typography>
            </div>
            <div className="tw-flex tw-items-center tw-gap-3">
              <Chip value={`${items.length} item${items.length === 1 ? "" : "s"}`} color="blue" variant="ghost" />
              <Button color="gray" variant="outlined" onClick={addItemRow}>
                <div className="tw-flex tw-items-center tw-gap-2">
                  <PlusIcon className="tw-h-4 tw-w-4" />
                  <span>Add Item</span>
                </div>
              </Button>
            </div>
          </CardHeader>
          <CardBody className="tw-space-y-4">
            {items.map((item, index) => (
              <Card key={item.id} className="tw-border tw-border-blue-gray-50 tw-shadow-sm">
                <CardHeader
                  floated={false}
                  shadow={false}
                  className="tw-flex tw-items-center tw-justify-between tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4"
                >
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-600">
                    Item {index + 1}
                  </Typography>
                  <IconButton
                    variant="text"
                    color="red"
                    onClick={() => removeItemRow(item.id)}
                    disabled={items.length === 1}
                  >
                    <TrashIcon className="tw-h-4 tw-w-4" />
                  </IconButton>
                </CardHeader>
                <CardBody className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
                  <Select
                    label="Material"
                    variant="outlined"
                    value={item.materialId}
                    onChange={(value) => handleMaterialSelect(item.id, value ?? "")}
                    disabled={isMaterialsLoading}
                  >
                    {materialSelectOptions}
                  </Select>
                  <Input
                    label="Custom Name"
                    variant="outlined"
                    value={item.name}
                    onChange={(event) => handleItemChange(item.id, "name", event.target.value)}
                  />
                  <Input
                    type="number"
                    label="Quantity"
                    variant="outlined"
                    value={item.qty}
                    onChange={(event) => handleItemChange(item.id, "qty", event.target.value)}
                    min="0"
                  />
                  <Select
                    label="Unit"
                    variant="outlined"
                    value={item.unit}
                    onChange={(value) => handleItemChange(item.id, "unit", value ?? UNIT_OPTIONS[0])}
                  >
                    {UNIT_OPTIONS.map((option) => (
                      <Option key={option} value={option}>
                        {option}
                      </Option>
                    ))}
                  </Select>
                  <Input
                    label="Note"
                    variant="outlined"
                    value={item.note}
                    onChange={(event) => handleItemChange(item.id, "note", event.target.value)}
                  />
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>
      </DialogBody>
      <DialogFooter className="tw-flex tw-gap-3">
        <Button variant="text" color="blue-gray" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button color="gray" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Request"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
