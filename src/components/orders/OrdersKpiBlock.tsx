"use client";

import useSWR from "swr";

import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";

import {
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

type OrdersMetrics = {
  newOrdersToday: number;
  urgentOrdersToday: number;
  timeCriticalOrders: number;
  followUpsDueToday: number;
};

const numberFormatter = new Intl.NumberFormat();

export default function OrdersKpiBlock() {
  const { data, error, isLoading } = useSWR<OrdersMetrics | null>(
    "/api/orders/metrics",
    async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to load orders metrics");
      }
      return response.json();
    },
    { refreshInterval: 60_000 }
  );

  const metrics = data ?? null;
  const subtitle = error ? "Unable to load metrics" : undefined;

  return (
    <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          <BlackBoxKpiCard
            icon={<ChartBarIcon className="tw-h-6 tw-w-6" />}
            title="New Orders Today"
            value={isLoading ? "…" : metrics ? numberFormatter.format(metrics.newOrdersToday) : undefined}
            subtitle={subtitle ?? "Created in the last 24 hours"}
          />
          <BlackBoxKpiCard
            icon={<BoltIcon className="tw-h-6 tw-w-6" />}
            title="Urgent Orders Today"
            value={isLoading ? "…" : metrics ? numberFormatter.format(metrics.urgentOrdersToday) : undefined}
            subtitle={subtitle ?? "Flagged as urgent today"}
          />
          <BlackBoxKpiCard
            icon={<ClockIcon className="tw-h-6 tw-w-6" />}
            title="Time-Critical Orders (≤ 3 days)"
            value={isLoading ? "…" : metrics ? numberFormatter.format(metrics.timeCriticalOrders) : undefined}
            subtitle={subtitle ?? "Due within the next 3 days"}
          />
          <BlackBoxKpiCard
            icon={<ClipboardDocumentCheckIcon className="tw-h-6 tw-w-6" />}
            title="Follow-up Due Today"
            value={isLoading ? "…" : metrics ? numberFormatter.format(metrics.followUpsDueToday) : undefined}
            subtitle={subtitle ?? "Pending responses due today"}
          />
    </div>
  );
}
