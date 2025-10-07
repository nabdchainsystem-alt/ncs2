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

const PieChartComponent = memo(function PieChart({
  height = 350,
  series,
  colors,
  labels,
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
            type: "donut",
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
          dataLabels: {
            enabled: false,
          },
          legend: {
            show: false,
          },
        },
        options ? options : {}
      ),
    }),
    [height, colors, labels, options]
  );
  return (
    <div
      ref={containerRef}
      className="tw-w-full tw-min-h-[380px]"
      style={{ minHeight: Math.max(height + 140, 380) }}
    >
      {ready ? (
        <ReactApexChart
          height={height}
          width={width || undefined}
          type="pie"
          series={series}
          options={chartOptions as any}
        />
      ) : (
        <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-text-blue-gray-300">
          Loading chart…
        </div>
      )}
    </div>
  );
});

PieChartComponent.displayName = "PieChart";

export const PieChart = PieChartComponent;
export default PieChartComponent;
