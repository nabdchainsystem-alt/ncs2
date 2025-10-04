"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
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
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

import { PlusIcon } from "@heroicons/react/24/outline";

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load follow-ups");
  }
  return response.json() as Promise<FollowUp[]>;
};

type PriorityValue = "Low" | "Normal" | "High" | "Urgent";

type FollowUp = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string;
  status: string;
  requestId: string | null;
  requestCode: string | null;
  priority: PriorityValue;
  requestPriority: PriorityValue | null;
};

type FormState = {
  title: string;
  dueDate: string;
  notes: string;
  requestCode: string;
  priority: PriorityValue;
};

const initialForm: FormState = {
  title: "",
  dueDate: "",
  notes: "",
  requestCode: "",
  priority: "Normal",
};

const priorityColorMap: Record<PriorityValue, string> = {
  Low: "#34d399",
  Normal: "#60a5fa",
  High: "#facc15",
  Urgent: "#f87171",
};

export default function FollowUpCalendar() {
  const { data, error, mutate } = useSWR<FollowUp[]>("/api/requests/follow-ups", fetcher, {
    refreshInterval: 60_000,
  });

  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const events = useMemo(() => {
    return (data ?? []).map((task) => {
      const color = priorityColorMap[task.priority];
      return {
        id: task.id,
        title: task.requestCode ? `${task.title} (${task.requestCode})` : task.title,
        start: task.dueDate,
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: "#0f172a",
        extendedProps: task,
      };
    });
  }, [data]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      if (!formState.title.trim()) {
        setFormError("Title is required");
        return;
      }
      if (!formState.dueDate) {
        setFormError("Due date is required");
        return;
      }

      const payload = {
        title: formState.title.trim(),
        dueDate: new Date(formState.dueDate).toISOString(),
        notes: formState.notes.trim() || undefined,
        requestCode: formState.requestCode.trim() || undefined,
        priority: formState.priority,
      };

      const response = await fetch("/api/requests/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        setFormError(message || "Failed to create follow-up");
        return;
      }

      await mutate();
      setFormState(initialForm);
      setOpen(false);
    } catch (err) {
      console.error("Create follow-up failed", err);
      setFormError("Unexpected error while creating follow-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader
        floated={false}
        shadow={false}
        className="tw-flex tw-items-center tw-justify-between tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
      >
        <div className="tw-flex tw-flex-col">
          <Typography variant="h6" color="blue-gray">
            Follow-up Calendar
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Upcoming actions across requests
          </Typography>
        </div>
        <IconButton color="gray" onClick={() => setOpen(true)} aria-label="Add follow-up">
          <PlusIcon className="tw-h-5 tw-w-5" />
        </IconButton>
      </CardHeader>
      <CardBody className="tw-p-0">
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500 tw-p-6">
            Unable to load follow-ups
          </Typography>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            height={450}
            headerToolbar={{ start: "prev,next today", center: "title", end: "" }}
          />
        )}
      </CardBody>

      <Dialog open={open} handler={() => setOpen(false)} size="md">
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Schedule Follow-up
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Create a reminder to follow up on a request.
          </Typography>
        </DialogHeader>
        <DialogBody className="tw-space-y-4">
          {formError ? <Alert color="red">{formError}</Alert> : null}
          <Input
            label="Title"
            variant="outlined"
            value={formState.title}
            onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            type="date"
            label="Due date"
            variant="outlined"
            value={formState.dueDate}
            onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
          <Select
            label="Priority"
            variant="outlined"
            value={formState.priority}
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, priority: (value as PriorityValue) ?? "Normal" }))
            }
          >
            {(["Low", "Normal", "High", "Urgent"] as PriorityValue[]).map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
          <Input
            label="Request code (optional)"
            variant="outlined"
            value={formState.requestCode}
            onChange={(event) => setFormState((prev) => ({ ...prev, requestCode: event.target.value }))}
            placeholder="e.g. REQ-20251"
          />
          <Textarea
            label="Notes"
            variant="outlined"
            rows={3}
            value={formState.notes}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </DialogBody>
        <DialogFooter className="tw-flex tw-gap-3">
          <Button variant="text" color="blue-gray" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button color="gray" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </Dialog>
    </Card>
  );
}
