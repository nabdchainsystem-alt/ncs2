"use client";

import { useMemo, useState } from "react";

import VendorFiltersBar, { type VendorFilters } from "./VendorFiltersBar";
import VendorsTable from "./VendorsTable";
import { useVendors } from "@/hooks/vendors";

const initialFilters: VendorFilters = {
  search: "",
  status: "all",
  category: null,
};

export default function VendorsPageContent() {
  const [filters, setFilters] = useState<VendorFilters>(initialFilters);

  const { data } = useVendors({ page: 1, pageSize: 100, status: filters.status === "all" ? "" : filters.status === "active" ? "Active" : "Inactive" });

  const categories = useMemo(() => {
    if (!data?.rows) return [] as string[];
    const set = new Set<string>();
    data.rows.forEach((row) => {
      if (row.category) {
        set.add(row.category);
      }
    });
    return Array.from(set);
  }, [data?.rows]);

  return (
    <>
      <VendorFiltersBar value={filters} onChange={setFilters} categories={categories} />
      <VendorsTable filters={filters} />
    </>
  );
}
