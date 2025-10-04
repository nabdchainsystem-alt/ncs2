"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";

import {
  Button,
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
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

import { useMaterialsOptions } from "@/hooks/requests";
import {
  formatSAR,
  useCreatePurchaseOrder,
} from "@/hooks/orders/usePurchaseOrders";

const unitOptions = ["PC", "KG", "L", "Carton", "Pallet"] as const;

type Unit = (typeof unitOptions)[number];

type ItemState = {
  key: string;
  materialId: string | null;
  name: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  note: string;
};

type SuggestedItem = {
  materialId?: string | null;
  name?: string | null;
  qty?: number;
  unit?: Unit;
  unitPrice?: number;
  note?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  rfqId: string;
  vendorId: string;
  suggestedItems?: SuggestedItem[];
  onCreated?: (payload: { id: string; poNo: string }) => void;
};

const defaultItem = (): ItemState => ({
  key: crypto.randomUUID(),
  materialId: null,
  name: "",
  qty: 1,
  unit: "PC",
  unitPrice: 0,
  note: "",
});

const prepareInitialItems = (suggested?: SuggestedItem[]) => {
  if (!suggested || !suggested.length) {
    return [defaultItem()];
  }

  return suggested.map((item) => ({
    key: crypto.randomUUID(),
    materialId: item.materialId ?? null,
    name: item.name ?? "",
    qty: item.qty && item.qty > 0 ? item.qty : 1,
    unit: item.unit ?? "PC",
    unitPrice: item.unitPrice && item.unitPrice >= 0 ? item.unitPrice : 0,
    note: item.note ?? "",
  }));
};

export default function CreatePoModal({
  open,
  onClose,
  rfqId,
  vendorId,
  suggestedItems,
  onCreated,
}: Props) {
  const [items, setItems] = useState<ItemState[]>(() => prepareInitialItems(suggestedItems));
  const [error, setError] = useState<string | null>(null);

  const { options: materialOptions } = useMaterialsOptions();
  const { create, isLoading, error: createError, setError: setCreateError } = useCreatePurchaseOrder();
  const { mutate: globalMutate } = useSWRConfig();

  const suggestedSignature = useMemo(
    () => JSON.stringify(suggestedItems ?? []),
    [suggestedItems]
  );

  const lastInitSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const signature = suggestedSignature;
    if (lastInitSignatureRef.current === signature) {
      return;
    }

    lastInitSignatureRef.current = signature;
    setItems(prepareInitialItems(suggestedItems));
    setError(null);
    setCreateError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestedSignature, setCreateError]);

  useEffect(() => {
    if (!open) {
      lastInitSignatureRef.current = null;
    }
  }, [open]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const vatPct = 15;
    const vatAmount = subtotal * (vatPct / 100);
    const total = subtotal + vatAmount;
    return { subtotal, vatPct, vatAmount, total };
  }, [items]);

  const handleItemChange = <K extends keyof ItemState>(index: number, key: K, value: ItemState[K]) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const addItem = () => setItems((prev) => [...prev, defaultItem()]);

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handleSave = async () => {
    setError(null);
    setCreateError(null);

    if (!items.length) {
      setError("Add at least one item");
      return;
    }

    for (const item of items) {
      if (!item.materialId && !item.name.trim()) {
        setError("Each item needs a material or name");
        return;
      }
      if (!Number.isFinite(item.qty) || item.qty <= 0) {
        setError("Quantities must be greater than zero");
        return;
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        setError("Unit price cannot be negative");
        return;
      }
    }

    try {
      const payload = {
        rfqId,
        vendorId,
        currency: "SAR",
        vatPct: totals.vatPct,
        items: items.map((item) => ({
          materialId: item.materialId ?? undefined,
          name: item.materialId ? undefined : item.name.trim(),
          qty: item.qty,
          unit: item.unit,
          unitPrice: item.unitPrice,
          note: item.note ? item.note.trim() : undefined,
        })),
      };

      const response = await create(payload);
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/purchase-orders"));
      onCreated?.(response);
      onClose();
    } catch (err) {
      if (err instanceof Error && !err.message) {
        setError("Failed to create purchase order");
      }
    }
  };

  return (
    <Dialog open={open} handler={onClose} size="xl">
      <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
        <Typography variant="h5" color="blue-gray">
          Create Purchase Order
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          Review items and confirm before creating the PO.
        </Typography>
      </DialogHeader>
      <DialogBody className="tw-space-y-6">
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
          <Input label="Currency" value="SAR" disabled crossOrigin="anonymous" />
          <Input label="VAT %" value="15.00" disabled crossOrigin="anonymous" />
        </div>

        <div className="tw-flex tw-items-center tw-justify-between">
          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
            Items
          </Typography>
          <Button color="blue" size="sm" onClick={addItem} className="tw-flex tw-items-center tw-gap-2">
            <PlusIcon className="tw-h-4 tw-w-4" /> Add Item
          </Button>
        </div>

        <div className="tw-space-y-4">
          {items.map((item, index) => (
            <div key={item.key} className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-p-4 tw-shadow-sm">
              <div className="tw-grid tw-grid-cols-1 tw-gap-4 lg:tw-grid-cols-5">
                <div className="tw-space-y-1">
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                    Material
                  </Typography>
                  <Select
                    value={item.materialId ?? ""}
                    onChange={(value) => {
                      const materialId = (value as string) || null;
                      setItems((prev) => {
                        const copy = [...prev];
                        const next = { ...copy[index] };
                        next.materialId = materialId;
                        if (materialId) {
                          const selected = materialOptions.find((option) => option.value === materialId);
                          next.name = selected?.label ?? next.name;
                        }
                        copy[index] = next;
                        return copy;
                      });
                    }}
                    label="Select material"
                  >
                    <Option value="">Custom</Option>
                    {materialOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </div>
                <Input
                  label="Name"
                  value={item.name}
                  onChange={(event) => handleItemChange(index, "name", event.target.value)}
                  disabled={Boolean(item.materialId)}
                  crossOrigin="anonymous"
                />
                <Input
                  type="number"
                  label="Qty"
                  value={item.qty}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    handleItemChange(index, "qty", Number.isNaN(value) ? 0 : value);
                  }}
                  crossOrigin="anonymous"
                />
                <Select
                  value={item.unit}
                  onChange={(value) => handleItemChange(index, "unit", value as Unit)}
                  label="Unit"
                >
                  {unitOptions.map((unit) => (
                    <Option key={unit} value={unit}>
                      {unit}
                    </Option>
                  ))}
                </Select>
                <Input
                  type="number"
                  label="Unit Price"
                  value={item.unitPrice}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    handleItemChange(index, "unitPrice", Number.isNaN(value) ? 0 : value);
                  }}
                  crossOrigin="anonymous"
                />
              </div>
              <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-4 lg:tw-grid-cols-[minmax(0,1fr)_auto]">
                <Textarea
                  label="Note"
                  value={item.note}
                  onChange={(event) => handleItemChange(index, "note", event.target.value)}
                />
                <div className="tw-flex tw-flex-col tw-items-end tw-gap-3">
                  <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                    Line Total
                  </Typography>
                  <Typography variant="h6" color="blue-gray">
                    {formatSAR(item.qty * item.unitPrice)}
                  </Typography>
                  <IconButton
                    variant="text"
                    color="red"
                    aria-label="Remove item"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <MinusIcon className="tw-h-4 tw-w-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-blue-gray-50 tw-p-4 tw-grid tw-gap-3 md:tw-grid-cols-2 lg:tw-grid-cols-4">
          <div>
            <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
              Subtotal
            </Typography>
            <Typography variant="h6" color="blue-gray">
              {formatSAR(totals.subtotal)}
            </Typography>
          </div>
          <div>
            <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
              VAT (15%)
            </Typography>
            <Typography variant="h6" color="blue-gray">
              {formatSAR(totals.vatAmount)}
            </Typography>
          </div>
          <div>
            <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
              Total
            </Typography>
            <Typography variant="h6" color="blue-gray">
              {formatSAR(totals.total)}
            </Typography>
          </div>
        </div>

        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            {error}
          </Typography>
        ) : null}
        {createError ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            {createError}
          </Typography>
        ) : null}
      </DialogBody>
      <DialogFooter className="tw-flex tw-gap-3">
        <Button variant="text" color="blue-gray" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button color="green" onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
