"use client";

import { UsersIcon, CheckCircleIcon, BanknotesIcon, ClockIcon } from "@heroicons/react/24/outline";

import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import { useVendorKpis, sar } from "@/hooks/vendors";

const numberFormatter = new Intl.NumberFormat();
const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export default function VendorsKpiRow() {
  const { data, isLoading, isError } = useVendorKpis();

  const totalValue = isError ? "—" : isLoading ? "…" : numberFormatter.format(data?.total ?? 0);
  const activeValue = isError ? "—" : isLoading ? "…" : numberFormatter.format(data?.active ?? 0);
  const monthlySpendValue = isError
    ? "—"
    : isLoading
    ? "…"
    : sar(data?.monthlySpend ?? 0);
  const avgOnTimeValue = isError
    ? "—"
    : isLoading
    ? "…"
    : `${percentFormatter.format(data?.avgOnTimePct ?? 0)}%`;

  return (
    <section className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
      <BlackBoxKpiCard
        icon={<UsersIcon className="tw-h-6 tw-w-6" />}
        title="Total Vendors"
        value={totalValue}
        subtitle="Active + inactive vendors"
      />
      <BlackBoxKpiCard
        icon={<CheckCircleIcon className="tw-h-6 tw-w-6" />}
        title="Active Vendors"
        value={activeValue}
        subtitle="Approved for sourcing"
      />
      <BlackBoxKpiCard
        icon={<BanknotesIcon className="tw-h-6 tw-w-6" />}
        title="Monthly Spend (SAR)"
        value={monthlySpendValue}
        subtitle="Purchase orders booked this month"
      />
      <BlackBoxKpiCard
        icon={<ClockIcon className="tw-h-6 tw-w-6" />}
        title="Avg On-Time %"
        value={avgOnTimeValue}
        subtitle="Delivered vs total POs"
      />
    </section>
  );
}
