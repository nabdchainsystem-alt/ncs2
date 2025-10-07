"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import { motion } from "framer-motion";

import {
  Alert,
  Button,
  Card,
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
import MaterialCatalogModal from "@/components/requests/MaterialCatalogModal";
import type { MaterialHit } from "@/hooks/useMaterialSearch";
import {
  useCreateRequest,
  useDepartmentsOptions,
  useWarehousesOptions,
  useMachinesOptions,
  useVendorsOptions,
} from "@/hooks/requests";
import {
  PlusIcon,
  TrashIcon,
  Squares2X2Icon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  Bars3BottomLeftIcon,
} from "@heroicons/react/24/outline";

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"] as const;
const UNIT_OPTIONS = ["PC", "KG", "L", "Carton", "Pallet"] as const;
const BASE_REQUEST_CODE = 20251;

type ItemRow = {
  id: string;
  materialId: string;
  materialLabel: string;
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
  materialLabel: "",
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
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

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
  const { createRequest, isLoading, error, setError } = useCreateRequest();

  const initRef = useRef(false);
  const submitLockRef = useRef(false);

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
    setCatalogOpen(false);
    setActiveRowId(null);
  }, [setError]);

  useEffect(() => {
    if (!open) {
      initRef.current = false;
      return;
    }

    if (initRef.current) {
      return;
    }

    resetForm();
    refreshDepartments();
    refreshWarehouses();
    refreshMachines();
    refreshVendors();
    initRef.current = true;
  }, [
    open,
    resetForm,
    refreshDepartments,
    refreshMachines,
    refreshVendors,
    refreshWarehouses,
  ]);

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

  const applyMaterialToRow = (id: string, material: MaterialHit | null) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (!material) {
          return {
            ...item,
            materialId: "",
            materialLabel: "",
          };
        }

        return {
          ...item,
          materialId: material.id,
          materialLabel: material.code || item.materialLabel,
          unit: material.unit ?? item.unit,
          name: material.name?.trim().length ? material.name : item.name,
        };
      })
    );
  };

  const openCatalogForRow = (id: string) => {
    setActiveRowId(id);
    setCatalogOpen(true);
  };

  const closeCatalog = () => {
    setCatalogOpen(false);
    setActiveRowId(null);
  };

  const handleCatalogSelect = (material: MaterialHit) => {
    if (!activeRowId) return;
    applyMaterialToRow(activeRowId, material);
    closeCatalog();
    setTimeout(() => {
      const qtyField = document.getElementById(`qty-${activeRowId}`) as HTMLInputElement | null;
      qtyField?.focus();
    }, 20);
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

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = async () => {
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    const releaseLock = () => {
      submitLockRef.current = false;
    };

    setFormError(null);
    setItemsError(null);
    setError(null);

    if (!formState.priority) {
      setFormError("Priority is required");
      releaseLock();
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
        releaseLock();
        return;
      }

      const hasMaterial = item.materialId && item.materialId.length > 0;
      const nameText = item.name.trim();

      if (!hasMaterial && !nameText) {
        setItemsError("Each item requires selecting a material or providing a name.");
        releaseLock();
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
        releaseLock();
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
      handleClose();
    } catch (err) {
      // Error handled via hook state.
    } finally {
      releaseLock();
    }
  };

  const isAssociationsLoading =
    isDepartmentsLoading || isWarehousesLoading || isMachinesLoading || isVendorsLoading;

  if (!open) {
    return null;
  }

  return (
    <>
    <Dialog
      open={open}
      handler={handleClose}
      size="lg"
      dismiss={{ outsidePress: !catalogOpen }}
      className="tw-w-full tw-max-w-4xl tw-max-h-[72vh]"
      containerProps={{ className: "!tw-grid !tw-min-h-screen !tw-place-items-center tw-p-4" }}
    >
      <DialogHeader className="tw-flex tw-flex-col tw-gap-2 tw-rounded-t-3xl tw-border-b tw-border-blue-gray-100 tw-bg-white tw-px-6 tw-py-5">
        <Typography variant="h4" className="!tw-font-semibold tw-text-blue-gray-900">
          New Request
        </Typography>
        <Typography className="!tw-font-normal !tw-text-blue-gray-500">
          A focused workflow to capture associations, urgency, and line items.
        </Typography>
      </DialogHeader>
      <DialogBody className="tw-space-y-5 tw-overflow-y-auto tw-bg-[#f5f6f8] tw-p-0">
        <div className="tw-space-y-5 tw-rounded-b-3xl tw-bg-[#f5f6f8] tw-px-6 tw-py-5">
          {formError ? <Alert color="red">{formError}</Alert> : null}
          {error ? <Alert color="red">{error}</Alert> : null}
          {itemsError ? <Alert color="red">{itemsError}</Alert> : null}

          <div className="tw-rounded-2xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-5 tw-shadow-sm">
            <SectionHeading
              icon={Squares2X2Icon}
              step="Step 1"
              title="Request Associations"
              subtitle="Link the request to the right teams, vendors, and assets."
            />
            <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
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
                    departmentLabel: option
                      ? option.code
                        ? `${option.label} (${option.code})`
                        : option.label
                      : "",
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
                    warehouseLabel: option
                      ? option.code
                        ? `${option.label} (${option.code})`
                        : option.label
                      : "",
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
                    machineLabel: option
                      ? option.code
                        ? `${option.label} (${option.code})`
                        : option.label
                      : "",
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
                    vendorLabel: option
                      ? option.category
                        ? `${option.label} · ${option.category}`
                        : option.label
                      : "",
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
            </div>
          </div>

          <div className="tw-rounded-2xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-5 tw-shadow-sm">
            <SectionHeading
              icon={ClipboardDocumentCheckIcon}
              step="Step 2"
              title="Request Details"
              subtitle="Set urgency, timelines, and provide supporting context."
            />
            <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-4 lg:tw-grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="tw-grid tw-grid-cols-1 tw-gap-4">
                <div className="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    label="Request Number"
                    variant="outlined"
                    value={formState.code}
                    onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder="Enter or generate"
                    disabled={isLoading || isGeneratingCode}
                  />
                  <Button
                    color="blue-gray"
                    variant="outlined"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode || isLoading}
                  >
                    {isGeneratingCode ? "Generating..." : "Generate"}
                  </Button>
                </div>
                <div className="tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
                  <Select
                    label="Priority"
                    variant="outlined"
                    value={formState.priority}
                    onChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        priority: (value as typeof PRIORITY_OPTIONS[number]) ?? "",
                      }))
                    }
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <Option key={priority} value={priority}>
                        {priority}
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
                </div>
                <Textarea
                  label="Description"
                  variant="outlined"
                  rows={3}
                  className="tw-min-h-[100px]"
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="tw-rounded-2xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-5 tw-shadow-sm">
            <div className="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
              <SectionHeading
                icon={CubeIcon}
                step="Step 3"
                title="Line Items"
                subtitle="Specify the materials or custom descriptions included in this request."
              />
              <div className="tw-flex tw-items-center tw-gap-3">
                <Chip
                  value={`${items.length} item${items.length === 1 ? "" : "s"}`}
                  color="blue"
                  variant="ghost"
                />
                <Button color="blue-gray" variant="outlined" onClick={addItemRow}>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <PlusIcon className="tw-h-4 tw-w-4" />
                    <span>Add Item</span>
                  </div>
                </Button>
              </div>
            </div>

            <div className="tw-mt-4 tw-max-h-[260px] tw-space-y-4 tw-overflow-y-auto tw-pr-1">
              {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-5 tw-shadow-sm"
                  >
                    <div className="tw-flex tw-items-center tw-justify-between">
                      <div className="tw-flex tw-items-center tw-gap-3">
                        <Chip value={`Item ${index + 1}`} color="blue" variant="ghost" />
                        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                          Choose a catalog material or provide a custom description.
                        </Typography>
                      </div>
                      <IconButton
                        variant="text"
                        color="red"
                        onClick={() => removeItemRow(item.id)}
                        disabled={items.length === 1}
                      >
                        <TrashIcon className="tw-h-4 tw-w-4" />
                      </IconButton>
                    </div>
                    <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2 xl:tw-grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <div className="tw-flex-1">
                          <Input
                            label="Item Code"
                            variant="outlined"
                            value={item.materialLabel}
                            readOnly={Boolean(item.materialId)}
                            onClick={() => openCatalogForRow(item.id)}
                            onChange={(event) => {
                              if (!item.materialId) {
                                handleItemChange(item.id, "materialLabel", event.target.value);
                              }
                            }}
                            placeholder={item.materialId ? "Select from catalog" : "Enter custom item code"}
                            className={item.materialId ? "tw-cursor-pointer" : undefined}
                          />
                        </div>
                        <IconButton
                          variant="text"
                          color="blue-gray"
                          onClick={() => openCatalogForRow(item.id)}
                          aria-label="Browse materials"
                        >
                          <Bars3BottomLeftIcon className="tw-h-5 tw-w-5" />
                        </IconButton>
                      </div>
                      <Input
                        label="Item Name"
                        variant="outlined"
                        value={item.name}
                        onChange={(event) => handleItemChange(item.id, "name", event.target.value)}
                      />
                      <Input
                        id={`qty-${item.id}`}
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
                        className="xl:tw-col-span-2"
                      />
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="tw-flex tw-gap-3 tw-rounded-b-3xl tw-border-t tw-border-blue-gray-100 tw-bg-white tw-p-6">
        <Button variant="text" color="blue-gray" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button color="blue-gray" variant="outlined" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Request"}
        </Button>
      </DialogFooter>
    </Dialog>


    <MaterialCatalogModal
      open={catalogOpen}
      onClose={closeCatalog}
      onSelect={handleCatalogSelect}
    />
  </>
  );
}


type SectionHeadingProps = {
  icon: ComponentType<ComponentProps<typeof Squares2X2Icon>>;
  title: string;
  subtitle: string;
  step: string;
};

function SectionHeading({ icon: Icon, title, subtitle, step }: SectionHeadingProps) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-center lg:tw-gap-4">
      <div className="tw-flex tw-items-center tw-gap-3">
        <Chip value={step} color="blue" variant="ghost" className="tw-uppercase" />
        <div className="tw-grid tw-h-12 tw-w-12 tw-place-items-center tw-rounded-2xl tw-bg-blue-50 tw-text-blue-500">
          <Icon className="tw-h-6 tw-w-6" />
        </div>
      </div>
      <div className="tw-flex tw-flex-col">
        <Typography variant="h6" color="blue-gray" className="tw-font-semibold">
          {title}
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          {subtitle}
        </Typography>
      </div>
    </div>
  );
}
