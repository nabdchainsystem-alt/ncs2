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

export function PolarChart({
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
    <div ref={containerRef} className="tw-w-full">
      {ready ? (
        <ReactApexChart
          height={height}
          width={width || undefined}
          type="polarArea"
          options={chartOptions as any}
          series={series}
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

export default PolarChart;
