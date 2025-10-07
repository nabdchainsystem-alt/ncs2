"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useMaterialSearch, type MaterialHit } from "@/hooks/useMaterialSearch";

export default function MaterialCatalogModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (material: MaterialHit) => void;
}) {
  const { query, setQuery, items, loading } = useMaterialSearch("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex((prev) => (items.length === 0 ? 0 : Math.min(prev, items.length - 1)));
  }, [items]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!items.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = items[activeIndex];
      if (hit) {
        onSelect(hit);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  const emptyHint = useMemo(() => {
    if (query.trim().length === 0) return "No materials yet";
    return `No matches for “${query}”. Try a different code.`;
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open, setQuery]);
  if (!open) return null;

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-[10500] tw-flex tw-items-center tw-justify-center tw-bg-black/40 tw-backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tw-w-[min(720px,92vw)] tw-rounded-xl tw-bg-white tw-p-6 tw-shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tw-mb-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search materials…"
            className="tw-w-full tw-rounded-lg tw-border tw-border-slate-300 tw-px-3 tw-py-2 tw-text-sm tw-outline-none focus:tw-ring-2 focus:tw-ring-cyan-400"
            autoComplete="off"
          />
        </div>

        <div className="tw-max-h-[50vh] tw-overflow-auto tw-rounded-lg tw-border tw-border-slate-100">
          {loading ? (
            <div className="tw-p-4 tw-text-sm tw-text-slate-500">Searching…</div>
          ) : items.length === 0 ? (
            <div className="tw-p-4 tw-text-sm tw-text-slate-500">{emptyHint}</div>
          ) : (
            <ul>
              {items.map((material, index) => {
                const isActive = index === activeIndex;
                return (
                  <li key={material.id}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        onSelect(material);
                      }}
                      className={`tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-3 tw-px-4 tw-py-3 tw-text-left tw-transition-colors focus:tw-outline-none ${
                        isActive ? "tw-bg-slate-100" : "hover:tw-bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="tw-text-sm tw-font-semibold tw-text-slate-900">{material.code}</div>
                        <div className="tw-text-xs tw-text-slate-500">{material.name ?? "Unnamed"}</div>
                      </div>
                      {material.unit ? (
                        <span className="tw-rounded-full tw-bg-slate-100 tw-px-2 tw-py-1 tw-text-[11px] tw-font-semibold tw-uppercase tw-text-slate-600">
                          {material.unit}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="tw-pt-4 tw-text-right">
          <button
            type="button"
            onClick={onClose}
            className="tw-rounded-md tw-border tw-border-slate-300 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-600 hover:tw-bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
