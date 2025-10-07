"use client";

import React, { memo, useMemo } from "react";
import dynamic from "next/dynamic";

// deepmerge
import merge from "deepmerge";
import { useApexContainer } from "./useApexContainer";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PropTypes = {
  height?: number;
  series: { name?: string; data: { x: number; y: number; z: number }[] }[];
  colors?: string | string[];
  options?: {};
};

const BubbleChartComponent = memo(function BubbleChart({
  height = 350,
  series,
  colors,
  options,
}: PropTypes) {
  const { containerRef, ready, width } = useApexContainer();
  const chartOptions = useMemo(
    () => ({
      colors,
      ...merge(
        {
          chart: {
            height: height,
            type: "bubble",
            zoom: {
              enabled: false,
            },
            toolbar: {
              show: false,
            },
            animations: {
              enabled: true,
            },
          },
          title: {
            show: "",
          },
          dataLabels: {
            enabled: false,
          },
          legend: {
            show: false,
          },
          markers: {
            size: 5,
            strokeWidth: 0,
            strokeColors: "transparent",
            hover: {
              size: 7,
            },
          },
          stroke: {
            curve: "straight",
            width: 4,
          },
          grid: {
            show: true,
            borderColor: "#e7e7e7",
            strokeDashArray: 5,
            xaxis: {
              lines: {
                show: true,
              },
            },
            padding: {
              top: 5,
              right: 20,
            },
          },
          tooltip: {
            theme: "dark",
          },
          yaxis: {
            labels: {
              style: {
                colors: "#9ca2b7",
                fontSize: "13px",
                fontFamily: "inherit",
                fontWeight: 300,
              },
            },
          },
          xaxis: {
            axisTicks: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
            labels: {
              style: {
                colors: "#9ca2b7",
                fontSize: "13px",
                fontFamily: "inherit",
                fontWeight: 300,
              },
            },
          },
        },
        options ? options : {}
      ),
    }),
    [height, colors, options]
  );

  return (
    <div
      ref={containerRef}
      className="tw-w-full tw-min-h-[300px]"
      style={{ minHeight: Math.max(height, 300) }}
    >
      {ready ? (
        <ReactApexChart
          type="bubble"
          height={height}
          width={width || undefined}
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

BubbleChartComponent.displayName = "BubbleChart";

export const BubbleChart = BubbleChartComponent;
export default BubbleChartComponent;
