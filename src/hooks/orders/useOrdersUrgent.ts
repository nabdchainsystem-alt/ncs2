"use client";

import { useCallback } from "react";
import useSWR from "swr";

export type UrgentKpisResponse = {
  totalOrders: number;
  openOrders: number;
  closedOrders: number;
  topSpendDept: string;
};

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
  topDepartment: string;
  topDepartmentPct: number;
};

const DEFAULT_KPIS: UrgentKpisResponse = {
  totalOrders: 0,
  openOrders: 0,
  closedOrders: 0,
  topSpendDept: "—",
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
  topDepartment: "—",
  topDepartmentPct: 0,
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
    data: kpis,
    error: kpisError,
    isLoading: kpisLoading,
    mutate: mutateKpis,
  } = useSWR<UrgentKpisResponse>(
    "/api/aggregates/orders/urgent-kpis",
    (url) => fetchJson(url, DEFAULT_KPIS)
  );

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
    "/api/aggregates/orders/spend/by-department",
    (url) => fetchJson(url, DEFAULT_BY_DEPT)
  );

  const mutate = useCallback(() => {
    return Promise.all([mutateKpis(), mutateStatus(), mutateByDept()]);
  }, [mutateByDept, mutateKpis, mutateStatus]);

  return {
    kpis: kpis ?? DEFAULT_KPIS,
    status: status ?? DEFAULT_STATUS,
    byDept: byDept ?? DEFAULT_BY_DEPT,
    isLoading: kpisLoading || statusLoading || byDeptLoading,
    error: kpisError ?? statusError ?? byDeptError,
    mutate,
  };
}
