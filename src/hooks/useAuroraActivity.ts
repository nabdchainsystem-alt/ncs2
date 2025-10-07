"use client";

import useSWR from "swr";

import type { Bucket } from "@/server/dateBuckets";

const SIGNAL_ORDER = ["New", "Pending", "Approved", "Closed"] as const;

type Signal = (typeof SIGNAL_ORDER)[number];

type SignalSource = "activity" | "fallback";

type SeriesPoint = {
  name: Signal;
  data: number[];
};

type AuroraActivityResponse = {
  entity: "requests" | "orders";
  bucket: Bucket;
  span: number;
  labels: string[];
  series: SeriesPoint[];
  meta: Record<Signal, { source: SignalSource; total: number }>;
};

const DEFAULT_RESPONSE: AuroraActivityResponse = {
  entity: "requests",
  bucket: "daily",
  span: 0,
  labels: [],
  series: SIGNAL_ORDER.map((name) => ({ name, data: [] })),
  meta: SIGNAL_ORDER.reduce(
    (acc, signal) => {
      acc[signal] = { source: "fallback", total: 0 } as { source: SignalSource; total: number };
      return acc;
    },
    {} as Record<Signal, { source: SignalSource; total: number }>
  ),
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return DEFAULT_RESPONSE;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to load Aurora activity");
  }
  return (await response.json()) as AuroraActivityResponse;
};

export function useAuroraActivity(entity: "requests" | "orders", bucket: Bucket) {
  const key = `/api/aurora-activity?entity=${entity}&bucket=${bucket}`;
  const { data, error, isLoading, mutate } = useSWR<AuroraActivityResponse>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    refreshInterval: 60_000,
  });

  return {
    data: data ?? DEFAULT_RESPONSE,
    error,
    isLoading,
    mutate,
  };
}
