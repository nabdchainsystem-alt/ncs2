"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import FullCalendar, { DatesSetArg, EventContentArg } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { useVendorActivity, useVendorFollowups, useVendors } from "@/hooks/vendors";
import type { VendorFollowupRow } from "@/hooks/vendors";

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const PRIORITY_COLORS: Record<string, string> = {
  Low: "#94a3b8",
  Normal: "#3b82f6",
  High: "#f59e0b",
  Urgent: "#ef4444",
};

const TIMELINE_COLORS: Record<string, string> = {
  "purchase-order": "#0ea5e9",
  rfq: "#6366f1",
  followup: "#f97316",
  invoice: "#22c55e",
  default: "#94a3b8",
};

function formatIso(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function VendorsFollowupsAndActivity() {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const initialFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const initialTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [range, setRange] = useState({ from: formatIso(initialFrom), to: formatIso(initialTo) });
  const [followupModal, setFollowupModal] = useState(false);
  const [followupForm, setFollowupForm] = useState({ title: "", dueAt: formatIso(today), notes: "" });
  const [followupError, setFollowupError] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);

  const { data: vendorsData } = useVendors({ page: 1, pageSize: 50, status: "" });
  const vendorOptions = useMemo(() => vendorsData?.rows ?? [], [vendorsData?.rows]);

  useEffect(() => {
    if (!selectedVendorId && vendorOptions.length > 0) {
      setSelectedVendorId(vendorOptions[0].id);
    }
  }, [selectedVendorId, vendorOptions]);

  const followups = useVendorFollowups(selectedVendorId, range);
  const activity = useVendorActivity(selectedVendorId, { take: 50 });

  const events = useMemo(() => {
    const rows = followups.data?.rows ?? [];
    return rows.map((item) => ({
      id: item.id,
      title: item.title,
      start: item.dueAt,
      allDay: true,
      backgroundColor: PRIORITY_COLORS[item.priority] ?? "#3b82f6",
      borderColor: PRIORITY_COLORS[item.priority] ?? "#3b82f6",
      extendedProps: item,
    }));
  }, [followups.data]);

  const handleDatesSet = (arg: DatesSetArg) => {
    const start = formatIso(arg.start);
    const endDate = new Date(arg.end.getTime() - MS_IN_DAY);
    const end = formatIso(endDate);
    setRange({ from: start, to: end });
  };

  const renderEventContent = (arg: EventContentArg) => {
    const item = arg.event.extendedProps as VendorFollowupRow;
    return (
      <div className="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-text-xs">
        <span className="tw-font-semibold">{item.title}</span>
        <span className="tw-text-blue-gray-400">{item.priority}</span>
      </div>
    );
  };

  const handleFollowupSubmit = async () => {
    if (!followupForm.title.trim()) {
      setFollowupError("Title is required");
      return;
    }
    if (!followupForm.dueAt) {
      setFollowupError("Due date is required");
      return;
    }
    try {
      await followups.create({
        title: followupForm.title.trim(),
        dueAt: followupForm.dueAt,
        notes: followupForm.notes.trim() || undefined,
      });
      setFollowupModal(false);
      setFollowupForm({ title: "", dueAt: formatIso(today), notes: "" });
      setFollowupError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create follow-up";
      setFollowupError(message);
    }
  };

  return (
    <section className="tw-grid tw-grid-cols-1 tw-gap-6 2xl:tw-grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-4">
          <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
            <div>
              <Typography variant="h6" color="blue-gray">
                Follow-up Calendar
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                Track vendor commitments and reminders
              </Typography>
            </div>
            <div className="tw-flex tw-items-center tw-gap-3">
              <Select
                label="Vendor"
                value={selectedVendorId ?? undefined}
                onChange={(value) => setSelectedVendorId(value)}
                className="tw-min-w-[220px]"
              >
                {vendorOptions.map((vendor) => (
                  <Option key={vendor.id} value={vendor.id}>
                    {vendor.nameEn}
                  </Option>
                ))}
              </Select>
              <Button color="blue" onClick={() => selectedVendorId && setFollowupModal(true)} disabled={!selectedVendorId}>
                Add
              </Button>
            </div>
          </div>
          <div className="tw-flex tw-gap-3">
            {Object.entries(PRIORITY_COLORS).map(([label, color]) => (
              <div key={label} className="tw-flex tw-items-center tw-gap-1">
                <span className="tw-inline-flex tw-h-3 tw-w-3 tw-rounded-full" style={{ backgroundColor: color }} />
                <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                  {label}
                </Typography>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventContent={renderEventContent}
            height={480}
            datesSet={handleDatesSet}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
          />
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-2">
          <Typography variant="h6" color="blue-gray">
            Activity Timeline
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Latest interactions and records for the selected vendor
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4 tw-overflow-y-auto tw-max-h-[520px]">
          {activity.isLoading ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              Loading activity…
            </Typography>
          ) : activity.isError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {activity.error instanceof Error ? activity.error.message : "Unable to load activity"}
            </Typography>
          ) : (activity.data?.rows?.length ?? 0) === 0 ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              No activity recorded for this vendor.
            </Typography>
          ) : (
            <ul className="tw-relative tw-space-y-4 before:tw-absolute before:tw-left-3 before:tw-h-full before:tw-border-l before:tw-border-blue-gray-100">
              {activity.data?.rows.map((item) => {
                const color = TIMELINE_COLORS[item.type] ?? TIMELINE_COLORS.default;
                return (
                  <li key={item.id} className="tw-relative tw-pl-10">
                    <span
                      className="tw-absolute tw-left-[9px] tw-top-1 tw-inline-flex tw-h-2.5 tw-w-2.5 tw-rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-700">
                      {item.title}
                    </Typography>
                    <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </Typography>
                    {item.description ? (
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        {item.description}
                      </Typography>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Dialog open={followupModal} handler={() => setFollowupModal(false)}>
        <DialogHeader>Add follow-up</DialogHeader>
        <DialogBody className="tw-space-y-4">
          {followupError ? (
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {followupError}
            </Typography>
          ) : null}
          <Input
            label="Title"
            value={followupForm.title}
            crossOrigin="anonymous"
            onChange={(event) => setFollowupForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <Input
            type="date"
            label="Due date"
            value={followupForm.dueAt}
            crossOrigin="anonymous"
            onChange={(event) => setFollowupForm((prev) => ({ ...prev, dueAt: event.target.value }))}
            required
          />
          <Textarea
            label="Notes"
            value={followupForm.notes}
            onChange={(event) => setFollowupForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </DialogBody>
        <DialogFooter className="tw-space-x-2">
          <Button variant="text" color="gray" onClick={() => setFollowupModal(false)}>
            Cancel
          </Button>
          <Button color="blue" onClick={handleFollowupSubmit} disabled={!selectedVendorId}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}
