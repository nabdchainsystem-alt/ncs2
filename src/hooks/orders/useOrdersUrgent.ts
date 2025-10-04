"use client";

import { useCallback } from "react";
import useSWR from "swr";

import { useOrdersOverviewKpis } from "./useOrdersOverviewKpis";

export type UrgentStatusSeries = Array<{
  name: string;
  data: number[];
}>;

export type UrgentStatusResponse = {
  labels: string[];
  series: UrgentStatusSeries;
};

export type UrgentByDeptResponse = {
  labels: string[];
  data: number[];
};

const DEFAULT_STATUS: UrgentStatusResponse = {
  labels: [],
  series: [
    { name: "Total", data: [] },
    { name: "Over SLA", data: [] },
    { name: "Within SLA", data: [] },
    { name: "Completed", data: [] },
    { name: "Pending", data: [] },
  ],
};

const DEFAULT_BY_DEPT: UrgentByDeptResponse = {
  labels: [],
  data: [],
};

const fetchJson = async <T,>(url: string, fallback: T) => {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return fallback;
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load ${url}`);
  }
  return (await response.json()) as T;
};

export function useOrdersUrgent(period: "daily" | "weekly" | "monthly" = "monthly") {
  const {
    data: status,
    error: statusError,
    isLoading: statusLoading,
    mutate: mutateStatus,
  } = useSWR<UrgentStatusResponse>(
    `/api/aggregates/orders/urgent-status?period=${period}`,
    (url) => fetchJson(url, DEFAULT_STATUS)
  );

  const {
    data: byDept,
    error: byDeptError,
    isLoading: byDeptLoading,
    mutate: mutateByDept,
  } = useSWR<UrgentByDeptResponse>(
    "/api/aggregates/orders/urgent-by-dept",
    (url) => fetchJson(url, DEFAULT_BY_DEPT)
  );

  const { data: kpis, error: kpisError, isLoading: kpisLoading, mutate: mutateKpis } =
    useOrdersOverviewKpis();

  const mutate = useCallback(() => {
    return Promise.all([mutateStatus(), mutateByDept(), mutateKpis()]);
  }, [mutateByDept, mutateKpis, mutateStatus]);

  return {
    kpis,
    status: status ?? DEFAULT_STATUS,
    byDept: byDept ?? DEFAULT_BY_DEPT,
    isLoading: kpisLoading || statusLoading || byDeptLoading,
    error: kpisError ?? statusError ?? byDeptError,
    mutate,
  };
}
