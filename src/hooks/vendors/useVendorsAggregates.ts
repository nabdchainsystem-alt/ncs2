import useSWR from "swr";

import { apiFetcher } from "./helpers";

export type OrdersByStatusResponse = {
  labels: string[];
  data: number[];
};

export type SpendTopRow = {
  vendor: string;
  orders: number;
  total: number;
  aov: number;
};

export type SpendTopResponse = {
  rows: SpendTopRow[];
  currency: string;
};

export type SpendByMonthResponse = {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
};

export type VendorSimpleSeries = {
  labels: string[];
  data: number[];
};

export type MaterialsTopRow = {
  material: string;
  orders: number;
  spend: number;
  avg: number;
};

export type MaterialsTopResponse = {
  rows: MaterialsTopRow[];
  currency: string;
};

export function useVendorsAggregates() {
  const ordersByStatus = useSWR<OrdersByStatusResponse>(
    "/api/aggregates/vendors/orders-by-status",
    apiFetcher
  );
  const spendTop = useSWR<SpendTopResponse>('/api/aggregates/vendors/spend-top?limit=10', apiFetcher);
  const spendByMonth = useSWR<SpendByMonthResponse>('/api/aggregates/vendors/spend-by-month?months=12', apiFetcher);
  const onTimeByVendor = useSWR<VendorSimpleSeries>(
    '/api/aggregates/vendors/ontime-by-vendor',
    apiFetcher
  );
  const leadTimeByVendor = useSWR<VendorSimpleSeries>(
    '/api/aggregates/vendors/leadtime-by-vendor',
    apiFetcher
  );
  const materialsTop = useSWR<MaterialsTopResponse>(
    '/api/aggregates/vendors/materials-top?limit=10',
    apiFetcher
  );

  const isLoading =
    ordersByStatus.isLoading ||
    spendTop.isLoading ||
    spendByMonth.isLoading ||
    onTimeByVendor.isLoading ||
    leadTimeByVendor.isLoading ||
    materialsTop.isLoading;

  const error =
    ordersByStatus.error ||
    spendTop.error ||
    spendByMonth.error ||
    onTimeByVendor.error ||
    leadTimeByVendor.error ||
    materialsTop.error;

  return {
    ordersByStatus,
    spendTop,
    spendByMonth,
    onTimeByVendor,
    leadTimeByVendor,
    materialsTop,
    isLoading,
    error,
    isError: Boolean(error),
  };
}
