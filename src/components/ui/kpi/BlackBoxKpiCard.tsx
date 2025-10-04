"use client";

import React from "react";

import { Chip, Typography } from "@/components/MaterialTailwind";

type Props = {
  icon: React.ReactNode;
  title: string;
  value?: React.ReactNode;
  deltaPct?: number;
  subtitle?: React.ReactNode;
};

type DeltaAppearance = {
  color: "green" | "red" | "blue-gray";
  prefix: string;
};

const getDeltaAppearance = (delta: number): DeltaAppearance => {
  if (delta > 0) return { color: "green", prefix: "+" };
  if (delta < 0) return { color: "red", prefix: "" };
  return { color: "blue-gray", prefix: "" };
};

export default function BlackBoxKpiCard({
  icon,
  title,
  value,
  deltaPct,
  subtitle,
}: Props) {
  const hasValue = value !== undefined && value !== null;
  const hasFooter = deltaPct !== undefined || subtitle !== undefined;

  return (
    <div className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-6 tw-shadow-sm">
      <div className="tw-flex tw-items-start tw-gap-4">
        <div className="tw-grid tw-h-12 tw-w-12 tw-place-items-center tw-rounded-2xl tw-bg-gray-900 tw-text-white">
          {icon}
        </div>
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography
            variant="small"
            color="blue-gray"
            className="!tw-font-semibold tw-uppercase tw-opacity-70"
          >
            {title}
          </Typography>
          <Typography
            variant="h3"
            className={`!tw-font-semibold ${
              hasValue ? "tw-text-blue-gray-900" : "tw-text-blue-gray-300"
            }`}
          >
            {hasValue ? value : "—"}
          </Typography>
        </div>
      </div>
      <hr className="tw-my-4 tw-border-blue-gray-100" />
      {hasFooter ? (
        <div className="tw-flex tw-items-center tw-gap-3">
          {deltaPct !== undefined ? (
            <Chip
              color={getDeltaAppearance(deltaPct).color}
              variant="ghost"
              className="tw-w-fit tw-text-xs !tw-font-semibold tw-uppercase"
              value={`${getDeltaAppearance(deltaPct).prefix}${deltaPct}%`}
            />
          ) : null}
          {subtitle ? (
            <Typography
              variant="small"
              className="!tw-font-normal !tw-text-blue-gray-500"
            >
              {subtitle}
            </Typography>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
