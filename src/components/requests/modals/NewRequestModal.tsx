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
import {
  useCreateRequest,
  useDepartmentsOptions,
  useWarehousesOptions,
  useMachinesOptions,
  useVendorsOptions,
  useMaterialsOptions,
} from "@/hooks/requests";
import {
  PlusIcon,
  TrashIcon,
  Squares2X2Icon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"] as const;
const UNIT_OPTIONS = ["PC", "KG", "L", "Carton", "Pallet"] as const;
const BASE_REQUEST_CODE = 20251;

type ItemRow = {
  id: string;
  materialId: string;
  materialLabel: string;
  materialDropdownOpen: boolean;
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
  materialDropdownOpen: false,
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
    refreshMaterials();
    initRef.current = true;
  }, [
    open,
    resetForm,
    refreshDepartments,
    refreshMachines,
    refreshMaterials,
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

const handleMaterialSelect = (
  id: string,
  materialId: string,
  label: string,
  unit?: string
) => {
  setItems((prev) =>
    prev.map((item) => {
      if (item.id !== id) return item;
      const matched = materialOptions.find((option) => option.value === materialId);
      const inferredName = label.includes("·")
        ? label.split("·").slice(1).join("·").trim()
        : label;

      return {
        ...item,
        materialId,
        materialLabel: label,
        unit: unit ?? matched?.unit ?? item.unit,
        materialDropdownOpen: false,
        name:
            item.name.trim().length === 0 && inferredName
              ? inferredName
              : item.name,
      };
    })
  );
};

  const handleMaterialInputChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              materialLabel: value,
              materialId: "",
              materialDropdownOpen: true,
              name:
                item.name.trim().length === 0
                  ? value
                  : item.name,
            }
          : item
      )
    );
  };

  const toggleMaterialDropdown = (id: string, open: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              materialDropdownOpen: open,
            }
          : item
      )
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

  useEffect(() => {
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (!item.materialId) {
          return item;
        }
        const matched = materialOptions.find((option) => option.value === item.materialId);
        if (!matched) {
          if (!item.materialLabel) {
            return item;
          }
          changed = true;
          return { ...item, materialLabel: "" };
        }
        if (item.materialLabel === matched.label && (!matched.unit || matched.unit === item.unit)) {
          return item;
        }
        changed = true;
        return {
          ...item,
          materialLabel: matched.label,
          unit: matched.unit ?? item.unit,
        };
      });
      return changed ? next : prev;
    });
  }, [materialOptions]);

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      handler={handleClose}
      size="lg"
      className="tw-w-full tw-max-w-4xl tw-max-h-[82vh]"
      containerProps={{ className: "!tw-grid !tw-min-h-screen !tw-place-items-center tw-p-4" }}
    >
      <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-3xl tw-border-b tw-border-blue-gray-100 tw-bg-white tw-p-6">
        <Typography variant="h4" className="!tw-font-semibold tw-text-blue-gray-900">
          New Request
        </Typography>
        <Typography className="!tw-font-normal !tw-text-blue-gray-500">
          A focused workflow to capture associations, urgency, and line items.
        </Typography>
      </DialogHeader>
      <DialogBody className="tw-space-y-5 tw-overflow-y-auto tw-bg-[#f5f6f8] tw-p-0">
        <div className="tw-space-y-5 tw-rounded-b-3xl tw-bg-[#f5f6f8] tw-p-5">
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
              {items.map((item, index) => {
                const query = item.materialLabel.trim().toLowerCase();
                const catalogMatches = query
                  ? materialOptions.filter((option) =>
                      option.label.toLowerCase().includes(query)
                    )
                  : materialOptions;
                const suggestionList = [
                  { value: "", label: "Use custom material", unit: undefined as string | undefined },
                  ...catalogMatches,
                ];

                return (
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
                      <div className="tw-relative">
                        <Input
                          label="Material"
                          variant="outlined"
                          value={item.materialLabel}
                          onChange={(event) => handleMaterialInputChange(item.id, event.target.value)}
                          onFocus={() => toggleMaterialDropdown(item.id, true)}
                          onBlur={() => setTimeout(() => toggleMaterialDropdown(item.id, false), 120)}
                          disabled={isMaterialsLoading}
                          placeholder="Type to search by code or name"
                        />
                        {item.materialDropdownOpen && suggestionList.length ? (
                          <div className="tw-absolute tw-left-0 tw-top-full tw-z-30 tw-mt-1 tw-max-h-64 tw-w-full tw-overflow-y-auto tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-shadow-xl">
                        {suggestionList.map((option, suggestionIndex) => (
                          <button
                            key={option.value || `custom-${suggestionIndex}`}
                            type="button"
                            className="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-4 tw-px-4 tw-py-2 tw-text-left tw-text-sm tw-text-blue-gray-700 hover:tw-bg-blue-gray-50"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                                  handleMaterialSelect(
                                    item.id,
                                    option.value,
                                    option.value ? option.label : item.materialLabel,
                                    option.unit
                                  )
                                }
                          >
                            <span>{option.label}</span>
                                {option.unit ? (
                                  <Chip value={option.unit} variant="ghost" size="sm" className="tw-h-5 tw-text-[11px]" />
                                ) : null}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
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
                        className="xl:tw-col-span-2"
                      />
                    </div>
                </div>
                );
              })}
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
