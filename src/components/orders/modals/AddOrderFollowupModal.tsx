"use client";

import { useEffect, useState } from "react";

import {
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

const priorityOptions = [
  { label: "Low", value: "Low" },
  { label: "Normal", value: "Normal" },
  { label: "High", value: "High" },
  { label: "Urgent", value: "Urgent" },
] as const;

type PriorityValue = (typeof priorityOptions)[number]["value"];

type FormState = {
  title: string;
  dueDate: string;
  priority: PriorityValue;
  orderCode: string;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultOrderCode?: string;
};

const initialState: FormState = {
  title: "",
  dueDate: "",
  priority: "Normal",
  orderCode: "",
  notes: "",
};

export default function AddOrderFollowupModal({ open, onClose, onCreated, defaultOrderCode }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...initialState, orderCode: defaultOrderCode ?? "" });
      setError(null);
    }
  }, [open, defaultOrderCode]);

  const resetAndClose = () => {
    setForm({ ...initialState, orderCode: defaultOrderCode ?? "" });
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.dueDate) {
      setError("Due date & time are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        dueDate: new Date(form.dueDate).toISOString(),
        priority: form.priority,
        orderCode: form.orderCode.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      const response = await fetch("/api/orders/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 404) {
          resetAndClose();
          return;
        }
        const message = await response.text();
        throw new Error(message || "Failed to create follow-up");
      }

      onCreated?.();
      resetAndClose();
    } catch (submissionError) {
      if (submissionError instanceof Error) {
        setError(submissionError.message);
      } else {
        setError("Unexpected error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} handler={resetAndClose} size="md">
      <DialogHeader>
        <Typography variant="h5" color="blue-gray">
          Add Order Follow-up
        </Typography>
      </DialogHeader>
      <DialogBody divider className="tw-space-y-4">
        <div className="tw-space-y-1">
          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
            Title
          </Typography>
          <Input
            crossOrigin="anonymous"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Follow-up subject"
          />
        </div>
        <div className="tw-space-y-1">
          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
            Due date &amp; time
          </Typography>
          <Input
            crossOrigin="anonymous"
            type="datetime-local"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
        </div>
        <div className="tw-space-y-1">
          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
            Priority
          </Typography>
          <Select
            value={form.priority}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, priority: (value as PriorityValue) ?? "Normal" }))
            }
            selected={(value) => value}
          >
            {priorityOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </div>
        <div className="tw-space-y-1">
          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
            Related order code (optional)
          </Typography>
          <Input
            crossOrigin="anonymous"
            value={form.orderCode}
            onChange={(event) => setForm((prev) => ({ ...prev, orderCode: event.target.value }))}
            placeholder="ORD-1234"
          />
        </div>
        <div className="tw-space-y-1">
          <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
            Notes
          </Typography>
          <Textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Add any extra context"
          />
        </div>
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            {error}
          </Typography>
        ) : null}
      </DialogBody>
      <DialogFooter className="tw-gap-2">
        <Button variant="text" color="blue-gray" onClick={resetAndClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          color="blue"
          onClick={handleConfirm}
          loading={isSubmitting}
        >
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
