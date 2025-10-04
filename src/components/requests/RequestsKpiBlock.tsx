"use client";

import useSWR from "swr";

import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";

import {
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

type RequestMetrics = {
  newRequestsToday: number;
  urgentRequestsToday: number;
  urgentDueSoon: number;
  followUpDueToday: number;
  deltas?: {
    newRequestsDelta: number;
    urgentRequestsDelta: number;
    urgentDueSoonDelta: number;
    followUpDueDelta: number;
  };
};

const numberFormatter = new Intl.NumberFormat();

export default function RequestsKpiBlock() {
  const { data, error, isLoading } = useSWR<RequestMetrics>(
    "/api/requests/metrics",
    async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load request metrics");
      }
      return response.json();
    },
    { refreshInterval: 60_000 }
  );

  const metrics: RequestMetrics = data ?? {
    newRequestsToday: 0,
    urgentRequestsToday: 0,
    urgentDueSoon: 0,
    followUpDueToday: 0,
    deltas: {
      newRequestsDelta: 0,
      urgentRequestsDelta: 0,
      urgentDueSoonDelta: 0,
      followUpDueDelta: 0,
    },
  };

  const formatValue = (value: number) =>
    isLoading ? "…" : numberFormatter.format(value);

  const getDelta = (value?: number) =>
    value === undefined || Number.isNaN(value) ? undefined : Math.round(value * 10) / 10;

  const commonSubtitle = error
    ? "Unable to load metrics"
    : undefined;

  return (
    <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
      <BlackBoxKpiCard
        icon={<ChartBarIcon className="tw-h-6 tw-w-6" />}
        title="New Requests Today"
        value={formatValue(metrics.newRequestsToday)}
        deltaPct={getDelta(metrics.deltas?.newRequestsDelta)}
        subtitle={commonSubtitle ?? "Created in the last 24 hours"}
      />
      <BlackBoxKpiCard
        icon={<BoltIcon className="tw-h-6 tw-w-6" />}
        title="Urgent Requests Today"
        value={formatValue(metrics.urgentRequestsToday)}
        deltaPct={getDelta(metrics.deltas?.urgentRequestsDelta)}
        subtitle={commonSubtitle ?? "Urgent submissions today"}
      />
      <BlackBoxKpiCard
        icon={<ClockIcon className="tw-h-6 tw-w-6" />}
        title="Time-Critical Urgent (≤ 3 days)"
        value={formatValue(metrics.urgentDueSoon)}
        deltaPct={getDelta(metrics.deltas?.urgentDueSoonDelta)}
        subtitle={commonSubtitle ?? "Urgent needed within 3 days"}
      />
      <BlackBoxKpiCard
        icon={<ClipboardDocumentCheckIcon className="tw-h-6 tw-w-6" />}
        title="Follow-up Due Today"
        value={formatValue(metrics.followUpDueToday)}
        deltaPct={getDelta(metrics.deltas?.followUpDueDelta)}
        subtitle={commonSubtitle ?? "Pending responses due today"}
      />
    </div>
  );
}
