import useSWR from "swr";

import { apiFetcher } from "./helpers";

export type VendorActivityRow = {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  description?: string;
  meta?: Record<string, unknown>;
};

type ResponseShape = {
  rows: VendorActivityRow[];
};

type Options = {
  take?: number;
};

export function useVendorActivity(id: string | null, options: Options = { take: 50 }) {
  const params = new URLSearchParams();
  if (options.take) {
    params.set("take", String(options.take));
  }
  const qs = params.toString();
  const key = id ? `/api/vendors/${id}/activity${qs ? `?${qs}` : ""}` : null;
  const { data, error, isLoading, mutate } = useSWR<ResponseShape>(key, apiFetcher);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
