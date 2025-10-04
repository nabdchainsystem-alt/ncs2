import useSWR from "swr";

import { PageDto } from "@/lib/api/pagination";

type Params = Record<string, string | number | undefined>;

const fetcher = async <T>(url: string): Promise<PageDto<T>> => {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch data");
  }

  return response.json();
};

export function usePaged<T>(endpoint: string, params: Params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const key = `${endpoint}?${searchParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PageDto<T>>(key, fetcher<T>);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? Number(params.page ?? 1),
    pageSize: data?.pageSize ?? Number(params.pageSize ?? 10),
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
