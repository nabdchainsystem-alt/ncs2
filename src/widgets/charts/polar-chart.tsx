"use client";

import React, { memo, useMemo } from "react";
import dynamic from "next/dynamic";

// deepmerge
import merge from "deepmerge";
import { useApexContainer } from "./useApexContainer";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PropTypes = {
  height?: number;
  series: number[];
  colors?: string | string[];
  labels?: string[];
  options?: {};
};

const PolarChartComponent = memo(function PolarChart({
  height = 350,
  colors,
  labels,
  series,
  options,
}: PropTypes) {
  const { containerRef, ready, width } = useApexContainer();
  const chartOptions = useMemo(
    () => ({
      colors,
      labels,
      ...merge(
        {
          chart: {
            type: "polarArea",
            height: height,
            toolbar: {
              show: false,
            },
            zoom: {
              enabled: false,
            },
            animations: {
              enabled: true,
            },
          },
          stroke: {
            colors: ["#fff"],
          },
          fill: {
            opacity: 1,
          },
          legend: {
            show: false,
          },
        },
        options ? options : {}
      ),
    }),
    [colors, labels, height, options]
  );
  return (
    <div
      ref={containerRef}
      className="tw-w-full tw-min-h-[300px]"
      style={{ minHeight: Math.max(height, 300) }}
    >
      {ready ? (
        <ReactApexChart
          height={height}
          width={width || undefined}
          type="polarArea"
          options={chartOptions as any}
          series={series}
        />
      ) : (
        <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-text-blue-gray-300">
          Loading chart…
        </div>
      )}
    </div>
  );
});

PolarChartComponent.displayName = "PolarChart";

export const PolarChart = PolarChartComponent;
export default PolarChartComponent;
