"use client";

import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  Option,
  Select,
  Textarea,
  Typography,
} from "@/components/MaterialTailwind";
import { useVendorsOptions } from "@/hooks/requests";
import { useCreateRFQ } from "@/hooks/requests/useRFQs";

const VAT_PERCENT = 15;

type Props = {
  open: boolean;
  requestId: string | null;
  onClose: () => void;
  onCreated?: () => void;
};

type FormState = {
  vendorId: string;
  qty: string;
  unitPrice: string;
  note: string;
};

const initialState: FormState = {
  vendorId: "",
  qty: "1",
  unitPrice: "0",
  note: "",
};

export default function CreateRfqModal({ open, requestId, onClose, onCreated }: Props) {
  const { options: vendorOptions, refresh: refreshVendors } = useVendorsOptions();
  const { createRFQ } = useCreateRFQ();
  const { mutate: globalMutate } = useSWRConfig();

  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      refreshVendors();
      setError(null);
    } else {
      setFormState(initialState);
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, refreshVendors]);

  const qty = Number.parseFloat(formState.qty) || 0;
  const unitPrice = Number.parseFloat(formState.unitPrice) || 0;
  const totalExVat = qty > 0 && unitPrice >= 0 ? qty * unitPrice : 0;
  const totalIncVat = totalExVat * (1 + VAT_PERCENT / 100);

  const totals = useMemo(
    () => ({
      exVat: totalExVat,
      incVat: totalIncVat,
    }),
    [totalExVat, totalIncVat]
  );

  const handleSave = async () => {
    if (!requestId) return;
    if (!formState.vendorId) {
      setError("Vendor is required");
      return;
    }
    const qtyValue = Number.parseFloat(formState.qty);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    const unitPriceValue = Number.parseFloat(formState.unitPrice);
    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      setError("Unit price must be zero or higher");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await createRFQ({
        requestId,
        vendorId: formState.vendorId,
        qty: qtyValue,
        unitPrice: unitPriceValue,
        vatPct: VAT_PERCENT,
        note: formState.note.trim() || undefined,
      });

      globalMutate((key) => typeof key === "string" && key.startsWith("/api/rfqs"));
      onCreated?.();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create RFQ");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} handler={onClose} size="md">
      <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
        <Typography variant="h5" color="blue-gray">
          Create RFQ
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          Issue a vendor quotation for this request.
        </Typography>
      </DialogHeader>
      <DialogBody className="tw-space-y-4">
        {error ? <Alert color="red">{error}</Alert> : null}
        <Select
          label="Vendor"
          variant="outlined"
          value={formState.vendorId}
          onChange={(value) => setFormState((prev) => ({ ...prev, vendorId: value ?? "" }))}
        >
          {vendorOptions.map((vendor) => (
            <Option key={vendor.value} value={vendor.value}>
              {vendor.label}
            </Option>
          ))}
        </Select>
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            label="Quantity"
            variant="outlined"
            value={formState.qty}
            onChange={(event) => setFormState((prev) => ({ ...prev, qty: event.target.value }))}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            label="Unit Price (SAR)"
            variant="outlined"
            value={formState.unitPrice}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, unitPrice: event.target.value }))
            }
          />
        </div>
        <Input label="VAT (%)" value={VAT_PERCENT.toFixed(2)} readOnly variant="outlined" />
        <Textarea
          label="Note"
          variant="outlined"
          rows={3}
          value={formState.note}
          onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
        />
        <div className="tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
          <div className="tw-flex tw-flex-col">
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Total (Excl. VAT)
            </Typography>
            <Typography variant="h6" color="blue-gray">
              {totals.exVat.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR
            </Typography>
          </div>
          <div className="tw-flex tw-flex-col">
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Total (Incl. VAT)
            </Typography>
            <Typography variant="h6" color="blue-gray">
              {totals.incVat.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR
            </Typography>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="tw-flex tw-gap-3">
        <Button variant="text" color="blue-gray" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button color="gray" onClick={handleSave} disabled={isSubmitting || !requestId}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
