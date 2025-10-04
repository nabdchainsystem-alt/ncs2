"use client";

import useSWR from "swr";

export type OrdersOverviewKpis = {
  totalOrders: number;
  openOrders: number;
  closedOrders: number;
  topSpendDept: string;
};

const DEFAULT_KPIS: OrdersOverviewKpis = {
  totalOrders: 0,
  openOrders: 0,
  closedOrders: 0,
  topSpendDept: "—",
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    if (response.status === 404) {
      return DEFAULT_KPIS;
    }
    const message = await response.text();
    throw new Error(message || `Failed to load ${url}`);
  }
  return response.json() as Promise<OrdersOverviewKpis>;
};

export function useOrdersOverviewKpis() {
  const { data, error, isLoading, mutate } = useSWR<OrdersOverviewKpis>(
    "/api/aggregates/orders/urgent-kpis",
    fetcher
  );

  return {
    data: data ?? DEFAULT_KPIS,
    error,
    isLoading,
    mutate,
  };
}
