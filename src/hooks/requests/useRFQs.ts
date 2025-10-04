import { useMemo } from "react";

import { usePaged } from "@/hooks/data/usePaged";

export type RFQRow = {
  id: string;
  quotationNo: string;
  createdAt: string;
  requestId: string;
  requestCode: string | null;
  requestStatus: string | null;
  requestPriority: string | null;
  vendorId: string;
  vendorName: string | null;
  qty: number;
  unitPrice: number;
  vatPct: number;
  totalExVat: number;
  totalIncVat: number;
  note: string | null;
};

export type RFQParams = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  requestId?: string;
};

export function useRFQs(params: RFQParams) {
  const sanitized = useMemo(() => ({
    page: params.page,
    pageSize: params.pageSize,
    ...(params.search ? { search: params.search } : {}),
    ...(params.sort ? { sort: params.sort } : {}),
    ...(params.requestId ? { requestId: params.requestId } : {}),
  }), [params]);

  return usePaged<RFQRow>("/api/rfqs", sanitized);
}

export function useCreateRFQ() {
  const createRFQ = async (payload: {
    requestId: string;
    vendorId: string;
    qty: number;
    unitPrice: number;
    vatPct?: number;
    note?: string;
  }) => {
    const response = await fetch("/api/rfqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "Failed to create RFQ";
      try {
        const json = await response.json();
        if (json && typeof json.message === "string") {
          message = json.message;
        }
      } catch (error) {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }

    return response.json() as Promise<{ id: string; quotationNo: string }>;
  };

  return { createRFQ };
}

export function useDeleteRFQ() {
  const deleteRFQ = async (id: string) => {
    const response = await fetch(`/api/rfqs/${id}`, {
      method: "DELETE",
      cache: "no-store",
    });

    if (!response.ok) {
      let message = "Failed to delete RFQ";
      try {
        const json = await response.json();
        if (json && typeof json.message === "string") {
          message = json.message;
        }
      } catch (error) {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }

    return response.json() as Promise<{ success: boolean }>;
  };

  return { deleteRFQ };
}
