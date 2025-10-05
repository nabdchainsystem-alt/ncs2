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

export function LineChart({
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
            type: "line",
            zoom: {
              enabled: false,
            },
            toolbar: {
              show: false,
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
    <div ref={containerRef} className="tw-w-full">
      {ready ? (
        <ReactApexChart
          type="line"
          height={height}
          width={width || undefined}
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

export default LineChart;
