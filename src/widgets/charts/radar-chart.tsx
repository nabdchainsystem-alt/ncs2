"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

// deepmerge
import merge from "deepmerge";
import { useApexContainer } from "./useApexContainer";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PropTypes = {
  height?: number;
  series: { name?: string; data: number[] }[];
  colors?: string | string[];
  options?: {};
};

export function RadarChart({
  height = 350,
  colors,
  series,
  options,
}: PropTypes) {
  const { containerRef, ready, width } = useApexContainer();
  const chartOptions = useMemo(
    () => ({
      colors,
      ...merge(
        {
          chart: {
            type: "radar",
            height: height,
            toolbar: {
              show: false,
            },
            zoom: {
              enabled: false,
            },
          },
          legend: {
            show: false,
          },
          title: {
            show: "",
          },
        },
        options ? options : {}
      ),
    }),
    [height, colors, options]
  );
  return (
    <div ref={containerRef} className="tw-w-full">
      {ready ? (
        <ReactApexChart
          height={height}
          width={width || undefined}
          type="radar"
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

export default RadarChart;
