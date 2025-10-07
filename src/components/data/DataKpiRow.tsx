"use client";

import { useMemo } from "react";
import {
  BuildingOfficeIcon,
  HomeModernIcon,
  CubeIcon,
  UsersIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import {
  useDepartments,
  useWarehouses,
  useMaterials,
  useVendors,
  useMachines,
} from "@/hooks/data";

function formatMetric(
  formatter: Intl.NumberFormat,
  count: number,
  loading: boolean,
  error: unknown,
  fallbackLabel: string
) {
  if (loading) {
    return { value: undefined, subtitle: "Loading…" };
  }

  if (error) {
    return { value: undefined, subtitle: fallbackLabel };
  }

  return { value: formatter.format(count), subtitle: fallbackLabel };
}

export default function DataKpiRow() {
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const departments = useDepartments({ page: 1, pageSize: 1 });
  const warehouses = useWarehouses({ page: 1, pageSize: 1 });
  const materials = useMaterials({ page: 1, pageSize: 1 });
  const vendorsTotal = useVendors({ page: 1, pageSize: 1 });
  const vendorsActive = useVendors({ page: 1, pageSize: 1, status: "Active" });
  const machinesTotal = useMachines({ page: 1, pageSize: 1 });
  const machinesActive = useMachines({ page: 1, pageSize: 1, status: "Active" });

  const departmentsCard = formatMetric(
    numberFormatter,
    departments.total,
    departments.isLoading,
    departments.error,
    departments.isError
      ? departments.error instanceof Error
        ? departments.error.message
        : "Unable to load departments"
      : "Total departments"
  );

  const warehousesCard = formatMetric(
    numberFormatter,
    warehouses.total,
    warehouses.isLoading,
    warehouses.error,
    warehouses.isError
      ? warehouses.error instanceof Error
        ? warehouses.error.message
        : "Unable to load warehouses"
      : "Total warehouses"
  );

  const materialsCard = formatMetric(
    numberFormatter,
    materials.total,
    materials.isLoading,
    materials.error,
    materials.isError
      ? materials.error instanceof Error
        ? materials.error.message
        : "Unable to load materials"
      : "Total materials"
  );

  const vendorActiveErrorText =
    vendorsActive.error instanceof Error
      ? vendorsActive.error.message
      : "Unable to load active vendors";
  const vendorTotalErrorText =
    vendorsTotal.error instanceof Error
      ? vendorsTotal.error.message
      : "Unable to load total vendors";

  const vendorsValue =
    vendorsActive.isLoading || vendorsActive.isError
      ? undefined
      : numberFormatter.format(vendorsActive.total);
  const vendorsSubtitle = vendorsActive.isLoading
    ? "Loading active vendors…"
    : vendorsActive.isError
    ? vendorActiveErrorText
    : vendorsTotal.isLoading
    ? "Loading total vendors…"
    : vendorsTotal.isError
    ? vendorTotalErrorText
    : `${numberFormatter.format(vendorsTotal.total)} total vendors`;

  const machinesActiveErrorText =
    machinesActive.error instanceof Error
      ? machinesActive.error.message
      : "Unable to load active machines";
  const machinesTotalErrorText =
    machinesTotal.error instanceof Error
      ? machinesTotal.error.message
      : "Unable to load total machines";

  const machinesValue =
    machinesActive.isLoading || machinesActive.isError
      ? undefined
      : numberFormatter.format(machinesActive.total);
  const machinesSubtitle = machinesActive.isLoading
    ? "Loading active machines…"
    : machinesActive.isError
    ? machinesActiveErrorText
    : machinesTotal.isLoading
    ? "Loading total machines…"
    : machinesTotal.isError
    ? machinesTotalErrorText
    : `${numberFormatter.format(machinesTotal.total)} total machines`;

  return (
    <section className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2 xl:tw-grid-cols-5">
      <BlackBoxKpiCard
        icon={<BuildingOfficeIcon className="tw-h-6 tw-w-6" />}
        title="Departments"
        value={departmentsCard.value}
        subtitle={departmentsCard.subtitle}
      />
      <BlackBoxKpiCard
        icon={<HomeModernIcon className="tw-h-6 tw-w-6" />}
        title="Warehouses"
        value={warehousesCard.value}
        subtitle={warehousesCard.subtitle}
      />
      <BlackBoxKpiCard
        icon={<CubeIcon className="tw-h-6 tw-w-6" />}
        title="Materials"
        value={materialsCard.value}
        subtitle={materialsCard.subtitle}
      />
      <BlackBoxKpiCard
        icon={<UsersIcon className="tw-h-6 tw-w-6" />}
        title="Vendors"
        value={vendorsValue}
        subtitle={vendorsSubtitle}
      />
      <BlackBoxKpiCard
        icon={<CpuChipIcon className="tw-h-6 tw-w-6" />}
        title="Machines"
        value={machinesValue}
        subtitle={machinesSubtitle}
      />
    </section>
  );
}
