import { useCallback, useState } from "react";
import useSWR from "swr";

import { useDepartments, useWarehouses, useMaterials, useVendors, useMachines } from "@/hooks/data";
import type { RequestRowDto, RequestDetailDto } from "./types";
export { useRequests } from "./useRequests";
export type { RequestRow, PageDto } from "./useRequests";
export type { RequestRowDto, RequestDetailDto } from "./types";

export function useRequest(id: string | null) {
  const key = id ? `/api/requests/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR<RequestDetailDto>(key, async (url: string) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to fetch request");
    }
    return response.json();
  });

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}

export function useDepartmentsOptions() {
  const { rows, isLoading, mutate } = useDepartments({ page: 1, pageSize: 100 });
  const options = rows.map((row) => ({
    value: row.id,
    label: row.name,
    code: row.code,
  }));
  const refresh = useCallback(() => mutate(), [mutate]);
  return { options, isLoading, refresh };
}

export function useWarehousesOptions() {
  const { rows, isLoading, mutate } = useWarehouses({ page: 1, pageSize: 100 });
  const options = rows.map((row) => ({
    value: row.id,
    label: row.name,
    code: row.code,
  }));
  const refresh = useCallback(() => mutate(), [mutate]);
  return { options, isLoading, refresh };
}

export function useMaterialsOptions() {
  const { rows, isLoading, mutate } = useMaterials({ page: 1, pageSize: 100 });
  const options = rows.map((row) => ({
    value: row.id,
    label: `${row.code} · ${row.name}`,
    unit: row.unit,
  }));
  const refresh = useCallback(() => mutate(), [mutate]);
  return { options, isLoading, refresh };
}

export function useVendorsOptions() {
  const { rows, isLoading, mutate } = useVendors({ page: 1, pageSize: 100 });
  const options = rows.map((row) => ({
    value: row.id,
    label: row.nameEn,
    category: row.category,
  }));
  const refresh = useCallback(() => mutate(), [mutate]);
  return { options, isLoading, refresh };
}

export function useMachinesOptions() {
  const { rows, isLoading, mutate } = useMachines({ page: 1, pageSize: 100 });
  const options = rows.map((row) => ({
    value: row.id,
    label: row.name,
    code: row.code,
  }));
  const refresh = useCallback(() => mutate(), [mutate]);
  return { options, isLoading, refresh };
}

export function useCreateRequest() {
  const [state, setState] = useState({ isLoading: false, error: null as string | null });

  const createRequest = async (payload: any) => {
    try {
      setState({ isLoading: true, error: null });
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.message ?? "Failed to create request";
        setState({ isLoading: false, error: message });
        throw new Error(message);
      }

      const body = await response.json();
      setState({ isLoading: false, error: null });
      return body as { id: string; code: string };
    } catch (error) {
      if (error instanceof Error) {
        setState({ isLoading: false, error: error.message });
      } else {
        setState({ isLoading: false, error: "Unexpected error" });
      }
      throw error;
    }
  };

  return {
    createRequest,
    isLoading: state.isLoading,
    error: state.error,
    setError: (value: string | null) => setState((prev) => ({ ...prev, error: value })),
  };
}
