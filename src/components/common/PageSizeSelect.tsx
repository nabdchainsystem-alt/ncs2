"use client";

import { memo } from "react";

import { Option, Select } from "@/components/MaterialTailwind";

type Props = {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  label?: string;
  className?: string;
};

const DEFAULT_OPTIONS = [5, 10, 25, 50];

function PageSizeSelectComponent({ value, onChange, options = DEFAULT_OPTIONS, label = "Rows", className }: Props) {
  return (
    <Select
      label={label}
      value={String(value)}
      onChange={(selected) => {
        if (!selected) return;
        const next = Number(selected);
        if (Number.isFinite(next)) {
          onChange(next);
        }
      }}
      className={className}
    >
      {options.map((option) => (
        <Option key={option} value={String(option)}>
          {option}
        </Option>
      ))}
    </Select>
  );
}

const PageSizeSelect = memo(PageSizeSelectComponent);

export default PageSizeSelect;
