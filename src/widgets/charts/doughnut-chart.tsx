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

const DoughnutChartComponent = memo(function DoughnutChart({
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
          responsive: [
            {
              breakpoint: 480,
              options: {
                chart: {
                  width: 200,
                },
              },
            },
          ],
        },
        options ? options : {}
      ),
    }),
    [height, colors, labels, options]
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
          type="donut"
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

DoughnutChartComponent.displayName = "DoughnutChart";

export const DoughnutChart = DoughnutChartComponent;
export default DoughnutChartComponent;
