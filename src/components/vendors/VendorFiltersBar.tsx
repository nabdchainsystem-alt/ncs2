"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Button,
  Chip,
  IconButton,
  Input,
  Typography,
} from "@/components/MaterialTailwind";
import { AdjustmentsHorizontalIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export type VendorFilters = {
  search: string;
  status: "all" | "active" | "inactive";
  category: string | null;
};

type Props = {
  value: VendorFilters;
  categories: string[];
  onChange: (next: VendorFilters) => void;
  onExport?: () => void;
};

const STATUS_OPTIONS: Array<{ label: string; value: VendorFilters["status"] }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export default function VendorFiltersBar({ value, categories, onChange, onExport }: Props) {
  const [searchTerm, setSearchTerm] = useState(value.search);

  useEffect(() => {
    setSearchTerm(value.search);
  }, [value.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchTerm !== value.search) {
        onChange({ ...value, search: searchTerm });
      }
    }, 350);

    return () => {
      clearTimeout(handle);
    };
  }, [searchTerm, onChange, value]);

  const sortedCategories = useMemo(() => {
    return Array.from(new Set(categories.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const selectStatus = (status: VendorFilters["status"]) => {
    if (status === value.status) return;
    onChange({ ...value, status });
  };

  const selectCategory = (category: string | null) => {
    if (category === value.category) return;
    onChange({ ...value, category });
  };

  return (
    <section className="tw-flex tw-flex-col tw-gap-4 tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-center">
        <div className="tw-flex tw-grow tw-items-center tw-gap-3">
          <Input
            crossOrigin="anonymous"
            label="Search vendors"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            icon={<AdjustmentsHorizontalIcon className="tw-h-5 tw-w-5 tw-text-blue-gray-300" />}
          />
        </div>
        <div className="tw-flex tw-items-center tw-gap-2">
          <Button
            color="gray"
            variant="outlined"
            className="tw-flex tw-items-center tw-gap-2"
            onClick={() => onChange({ ...value, search: "", status: "all", category: null })}
          >
            Reset
          </Button>
          <IconButton color="gray" variant="outlined" onClick={() => onExport?.()}>
            <ArrowDownTrayIcon className="tw-h-5 tw-w-5" />
          </IconButton>
        </div>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
          Status:
        </Typography>
        {STATUS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            value={option.label}
            variant={value.status === option.value ? "filled" : "ghost"}
            color={value.status === option.value ? "blue" : "blue-gray"}
            className="tw-cursor-pointer tw-text-xs !tw-font-semibold tw-uppercase"
            onClick={() => selectStatus(option.value)}
          />
        ))}
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
          Categories:
        </Typography>
        <Chip
          value="All"
          variant={value.category === null ? "filled" : "ghost"}
          color={value.category === null ? "blue" : "blue-gray"}
          className="tw-cursor-pointer tw-text-xs !tw-font-semibold"
          onClick={() => selectCategory(null)}
        />
        {sortedCategories.map((category) => (
          <Chip
            key={category}
            value={category}
            variant={value.category === category ? "filled" : "ghost"}
            color={value.category === category ? "blue" : "blue-gray"}
            className="tw-cursor-pointer tw-text-xs !tw-font-semibold"
            onClick={() => selectCategory(category)}
          />
        ))}
      </div>
    </section>
  );
}
