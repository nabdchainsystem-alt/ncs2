"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
    if (response.status === 404) {
      return [] as OrderFollowUp[];
    }
    throw new Error("Failed to load order follow-ups");
  }
  return response.json() as Promise<OrderFollowUp[]>;
};

type PriorityValue = "Low" | "Normal" | "High" | "Urgent";

type OrderFollowUp = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string;
  status: string;
  orderCode: string | null;
  priority: PriorityValue;
};

type FormState = {
  title: string;
  dueDate: string;
  notes: string;
  orderCode: string;
  priority: PriorityValue;
};

const initialForm: FormState = {
  title: "",
  dueDate: "",
  notes: "",
  orderCode: "",
  priority: "Normal",
};

const priorityColorMap: Record<PriorityValue, string> = {
  Low: "#94a3b8",
  Normal: "#3b82f6",
  High: "#f59e0b",
  Urgent: "#ef4444",
};

function formatRange(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function OrdersFollowupCalendar() {
  const today = new Date();
  const initialStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const initialEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [range, setRange] = useState(() => ({
    from: formatRange(initialStart),
    to: formatRange(initialEnd),
  }));
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string }>({
    x: 0,
    y: 0,
    content: "",
  });
  const [showTooltip, setShowTooltip] = useState(false);

  const key = `/api/orders/followups?from=${range.from}&to=${range.to}&status=open`;
  const { data, error, mutate, isLoading } = useSWR<OrderFollowUp[]>(key, fetcher, {
    refreshInterval: 60_000,
  });

  const { calendarEvents, groups, tooltipContent } = useMemo(() => {
    const groups = new Map<string, OrderFollowUp[]>();
    (data ?? []).forEach((item) => {
      const key = new Date(item.dueDate).toISOString().split("T")[0];
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    });

    const calendarEvents = (data ?? []).map((item) => ({
      id: item.id,
      title: "dot",
      start: item.dueDate,
      allDay: true,
      extendedProps: item,
    }));

    const tooltipMap = new Map<string, string>();
    groups.forEach((items, key) => {
      const lines = items.map((order) => {
        const code = order.orderCode ? ` (${order.orderCode})` : "";
        return `${order.priority}: ${order.title}${code}`;
      });
      tooltipMap.set(key, lines.join("\n"));
    });

    return { calendarEvents, groups, tooltipContent: tooltipMap };
  }, [data]);

  const renderEventContent = useCallback(() => null, []);

  const handleDayCellMount = useCallback(
    (arg: any) => {
      const key = arg.date.toISOString().split("T")[0];
      const items = groups.get(key);
      const wrapper = arg.el.querySelector(".orders-followup-dot-row");
      if (wrapper) {
        wrapper.remove();
      }

      if (!items || !items.length) {
        return;
      }

      const row = document.createElement("div");
      row.className = "orders-followup-dot-row tw-flex tw-justify-center tw-gap-1 tw-pt-1";

      items.forEach((item) => {
        const dot = document.createElement("span");
        dot.className = "tw-inline-flex tw-h-2 tw-w-2 tw-rounded-full";
        dot.style.backgroundColor = priorityColorMap[item.priority];
        dot.addEventListener("mouseenter", (event) => {
          if (!containerRef.current) return;
          const target = event.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setTooltip({
            content: tooltipContent.get(key) ?? "",
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 8,
          });
          setShowTooltip(true);
        });
        dot.addEventListener("mouseleave", () => setShowTooltip(false));
        row.appendChild(dot);
      });

      const frame = arg.el.querySelector(".fc-daygrid-day-frame");
      if (frame) {
        frame.appendChild(row);
      } else {
        arg.el.appendChild(row);
      }
    },
    [groups, tooltipContent]
  );

  const handleDayCellUnmount = useCallback((arg: any) => {
    const wrapper = arg.el.querySelector(".orders-followup-dot-row");
    if (wrapper) {
      wrapper.remove();
    }
  }, []);

  const handleDatesSet = useCallback((arg: any) => {
    const start = new Date(arg.start);
    const end = new Date(arg.end);
    end.setDate(end.getDate() - 1);
    setRange({ from: formatRange(start), to: formatRange(end) });
  }, []);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      if (!formState.title.trim()) {
        setFormError("Title is required");
        return;
      }
      if (!formState.dueDate) {
        setFormError("Due date & time are required");
        return;
      }

      const payload = {
        title: formState.title.trim(),
        dueDate: new Date(formState.dueDate).toISOString(),
        notes: formState.notes.trim() || undefined,
        orderCode: formState.orderCode.trim() || undefined,
        priority: formState.priority,
      };

      const response = await fetch("/api/orders/followups", {
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
      console.error("Create order follow-up failed", err);
      setFormError("Unexpected error while creating follow-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm tw-h-full">
      <CardHeader
        floated={false}
        shadow={false}
        className="tw-flex tw-items-start tw-justify-between tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-px-6 tw-pt-5 tw-pb-4"
      >
        <div className="tw-flex tw-flex-col">
          <Typography variant="h6" color="blue-gray">
            Follow-up Calendar
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Upcoming actions across purchase orders
          </Typography>
        </div>
        <IconButton color="gray" onClick={() => setOpen(true)} aria-label="Add follow-up">
          <PlusIcon className="tw-h-5 tw-w-5" />
        </IconButton>
      </CardHeader>
      <CardBody ref={containerRef} className="tw-relative tw-h-full tw-px-4 tw-pt-2 tw-pb-6">
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500 tw-p-6">
            Unable to load follow-ups
          </Typography>
        ) : isLoading && !data ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400 tw-p-6">
            Loading calendar…
          </Typography>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            key={`${range.from}-${range.to}`}
            events={calendarEvents}
            height={400}
            headerToolbar={{ start: "prev,next today", center: "", end: "title" }}
            showNonCurrentDates={false}
            fixedWeekCount={false}
            eventContent={renderEventContent}
            dayCellDidMount={handleDayCellMount}
            dayCellWillUnmount={handleDayCellUnmount}
            datesSet={handleDatesSet}
          />
        )}
        {showTooltip && tooltip.content ? (
          <div
            className="tw-pointer-events-none tw-absolute tw-z-50 tw-max-w-[240px] tw-rounded-lg tw-border tw-border-blue-gray-100 tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-text-blue-gray-600 tw-shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
          >
            {tooltip.content.split("\n").map((line, idx) => (
              <div key={idx} className="tw-whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </CardBody>

      <Dialog open={open} handler={() => setOpen(false)} size="md">
        <DialogHeader className="tw-flex tw-flex-col tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
          <Typography variant="h5" color="blue-gray">
            Schedule Follow-up
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Create a reminder to follow up on a purchase order.
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
            type="datetime-local"
            label="Due date & time"
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
            {( ["Low", "Normal", "High", "Urgent"] as PriorityValue[] ).map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
          <Input
            label="PO number (optional)"
            variant="outlined"
            value={formState.orderCode}
            onChange={(event) => setFormState((prev) => ({ ...prev, orderCode: event.target.value }))}
            placeholder="e.g. PO-2025Q10001"
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
