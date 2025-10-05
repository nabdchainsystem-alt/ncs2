"use client";

import React, { useMemo } from "react";
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

export function PieChart({
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
    <div ref={containerRef} className="tw-w-full">
      {ready ? (
        <ReactApexChart
          height={height}
          width={width || undefined}
          type="pie"
          series={series}
          options={chartOptions as any}
        />
      ) : (
        <div
          className="tw-grid tw-w-full tw-place-items-center tw-text-blue-gray-300"
          style={{ height }}
        >
          Loading chart…
        </div>
      )}
    </div>
  );
}

export default PieChart;
