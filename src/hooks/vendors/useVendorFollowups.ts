import { useCallback } from "react";
import useSWR from "swr";
import type { Priority } from "@prisma/client";

import { apiFetcher } from "./helpers";

export type VendorFollowupRow = {
  id: string;
  title: string;
  dueAt: string;
  priority: Priority;
  status: string;
  relatedType: string | null;
  relatedId: string | null;
  notes: string | null;
  createdAt: string;
};

type FollowupResponse = {
  rows: VendorFollowupRow[];
};

type Options = {
  from?: string;
  to?: string;
  status?: string;
};

export type CreateFollowupInput = {
  title: string;
  dueAt: string;
  priority?: Priority;
  status?: string;
  relatedType?: string;
  relatedId?: string;
  notes?: string;
};

export function useVendorFollowups(id: string | null, options: Options = {}) {
  const searchParams = new URLSearchParams();
  if (options.from) searchParams.set("from", options.from);
  if (options.to) searchParams.set("to", options.to);
  if (options.status) searchParams.set("status", options.status);

  const qs = searchParams.toString();
  const key = id ? `/api/vendors/${id}/followups${qs ? `?${qs}` : ""}` : null;
  const { data, error, isLoading, mutate } = useSWR<FollowupResponse>(key, apiFetcher);

  const create = useCallback(
    async (payload: CreateFollowupInput) => {
      if (!id) {
        throw new Error("Vendor id is required");
      }
      const response = await fetch(`/api/vendors/${id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create follow-up");
      }

      await mutate();
      return response.json();
    },
    [id, mutate]
  );

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
    create,
  };
}
