import useSWR from "swr";

import { apiFetcher } from "./helpers";

export type VendorKpis = {
  total: number;
  active: number;
  monthlySpend: number;
  avgOnTimePct: number;
  currency: string;
};

export function useVendorKpis() {
  const { data, error, isLoading, mutate } = useSWR<VendorKpis>(
    "/api/aggregates/vendors/kpis",
    apiFetcher
  );

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
