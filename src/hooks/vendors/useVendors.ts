import useSWR from "swr";

import type { PageDto } from "@/lib/api/pagination";

import { apiFetcher } from "./helpers";

export type VendorListRow = {
  id: string;
  nameEn: string;
  category: string;
  status: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

export type VendorListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "Active" | "Inactive" | "";
  category?: string;
  sort?: string;
};

const buildQuery = (params: VendorListParams) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.category) searchParams.set("category", params.category);
  if (params.sort) searchParams.set("sort", params.sort);

  const qs = searchParams.toString();
  return `/api/vendors${qs ? `?${qs}` : ""}`;
};

export function useVendors(params: VendorListParams) {
  const key = buildQuery(params);
  const { data, error, isLoading, mutate } = useSWR<PageDto<VendorListRow>>(key, apiFetcher);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
