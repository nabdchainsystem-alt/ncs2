import { useCallback, useState } from "react";
import useSWR from "swr";
import type { Priority } from "@prisma/client";

export type PageDto<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PoStatus = "OPEN" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";

export type PoListRow = {
  id: string;
  poNo: string;
  quotationNo: string;
  vendorName: string;
  subtotal: string;
  vatPct: string;
  vatAmount: string;
  total: string;
  currency: string;
  status: PoStatus;
  priority: Priority;
  createdAt: string;
};

export type PoDetail = {
  id: string;
  poNo: string;
  quotationNo: string;
  vendorName: string;
  status: PoStatus;
  priority: Priority;
  currency: string;
  vatPct: string;
  subtotal: string;
  vatAmount: string;
  total: string;
  note: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    materialCode: string | null;
    name: string;
    qty: string;
    unit: string;
    unitPrice: string;
    lineTotal: string;
    note: string | null;
  }>;
};

type PurchaseOrderParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PoStatus | "";
  vendor?: string;
  sort?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load purchase orders");
  }
  return response.json();
};

export function usePurchaseOrders(params: PurchaseOrderParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.vendor) searchParams.set("vendor", params.vendor);
  if (params.sort) searchParams.set("sort", params.sort);

  const key = `/api/purchase-orders${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<PageDto<PoListRow>>(key, fetcher);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}

export function usePurchaseOrder(id: string | null) {
  const key = id ? `/api/purchase-orders/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR<PoDetail>(key, fetcher);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}

type CreatePayload = {
  rfqId: string;
  vendorId: string;
  currency?: string;
  vatPct?: number;
  note?: string | null;
  items: Array<{
    materialId?: string | null;
    name?: string | null;
    qty: number;
    unit: string;
    unitPrice: number;
    note?: string | null;
  }>;
};

export function useCreatePurchaseOrder() {
  const [state, setState] = useState<{ isLoading: boolean; error: string | null }>({
    isLoading: false,
    error: null,
  });

  const create = useCallback(async (payload: CreatePayload) => {
    try {
      setState({ isLoading: true, error: null });
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to create purchase order";
        try {
          const json = await response.json();
          if (json && typeof json.message === "string") {
            message = json.message;
          } else if (typeof json === "string") {
            message = json;
          }
        } catch (parseError) {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      const body = (await response.json()) as { id: string; poNo: string };
      setState({ isLoading: false, error: null });
      return body;
    } catch (error) {
      if (error instanceof Error) {
        setState({ isLoading: false, error: error.message });
      } else {
        setState({ isLoading: false, error: "Unexpected error" });
      }
      throw error;
    }
  }, []);

  return {
    create,
    isLoading: state.isLoading,
    error: state.error,
    setError: (value: string | null) => setState((prev) => ({ ...prev, error: value })),
  };
}

export const formatSAR = (value: number | string) => {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) {
    return "SAR 0.00";
  }
  return `SAR ${numeric.toFixed(2)}`;
};
