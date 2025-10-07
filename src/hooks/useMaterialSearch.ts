"use client";

import { useEffect, useMemo, useState } from "react";

export type MaterialHit = {
  id: string;
  code: string;
  name: string | null;
  unit?: string | null;
};

const DEFAULT_DEBOUNCE = 300;

export function useMaterialSearch(initial = "") {
  const [query, setQuery] = useState(initial);
  const [items, setItems] = useState<MaterialHit[]>([]);
  const [loading, setLoading] = useState(false);

  const debounce = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (value: string, callback: (val: string) => void, wait = DEFAULT_DEBOUNCE) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => callback(value), wait);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    debounce(query, async (value) => {
      try {
        const endpoint = value
          ? `/api/materials/search?q=${encodeURIComponent(value)}&take=20`
          : `/api/materials/search`;
        const res = await fetch(endpoint, { cache: "no-store" });
        const data = (await res.json()) as MaterialHit[];
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("useMaterialSearch", error);
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [query, debounce]);

  return { query, setQuery, items, loading };
}
