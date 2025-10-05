import useSWR from "swr";

import { apiFetcher } from "./helpers";

export type InvoiceAgingBuckets = {
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
};

export type VendorInvoiceRow = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  outstanding: number;
  status: string;
  poId: string | null;
};

export type VendorInvoicesResponse = {
  buckets: InvoiceAgingBuckets;
  list: VendorInvoiceRow[];
  currency: string;
};

type Options = {
  aging?: boolean;
};

export function useVendorInvoices(id: string | null, options: Options = { aging: true }) {
  const shouldFetch = Boolean(id);
  const aging = options.aging !== false;
  const query = aging ? "?aging=1" : "";
  const key = shouldFetch ? `/api/vendors/${id}/invoices${query}` : null;

  const { data, error, isLoading, mutate } = useSWR<VendorInvoicesResponse>(key, apiFetcher);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
