import useSWR from "swr";

import { apiFetcher } from "./helpers";

export type VendorStats = {
  totalOrders: number;
  spend: number;
  onTimePct: number;
  avgLeadDays: number;
};

export type VendorDetail = {
  id: string;
  nameEn: string;
  nameAr: string | null;
  category: string;
  subCategory: string | null;
  contactPerson: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string | null;
  address: string | null;
  cr: string | null;
  crExpiry: string | null;
  vat: string | null;
  vatExpiry: string | null;
  bank: string | null;
  iban: string | null;
  companyNumber: string | null;
  createdAt: string;
  updatedAt: string;
  stats: VendorStats;
};

export function useVendor(id: string | null) {
  const key = id ? `/api/vendors/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR<VendorDetail>(key, apiFetcher);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
