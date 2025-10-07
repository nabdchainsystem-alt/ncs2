"use client";

import React, { memo, useMemo } from "react";
import dynamic from "next/dynamic";

// @material-tailwind/react
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Typography,
} from "@material-tailwind/react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useApexContainer } from "./useApexContainer";
import merge from "deepmerge";

type PropTypes = {
  chart: {};
  title: React.ReactNode;
  description: React.ReactNode;
  footer: React.ReactNode;
  color?:
    | "white"
    | "blue-gray"
    | "gray"
    | "brown"
    | "deep-orange"
    | "orange"
    | "amber"
    | "yellow"
    | "lime"
    | "light-green"
    | "green"
    | "teal"
    | "cyan"
    | "light-blue"
    | "blue"
    | "indigo"
    | "deep-purple"
    | "purple"
    | "pink"
    | "red";
};

const StatisticsChartComponent = memo(function StatisticsChart({
  color = "blue",
  chart,
  title,
  description,
  footer = null,
}: PropTypes) {
  const { containerRef, ready, width } = useApexContainer();
  const chartHeight = useMemo(() => {
    if (chart && typeof chart === "object" && "height" in chart) {
      const value = (chart as { height?: number }).height;
      if (typeof value === "number") {
        return value;
      }
    }
    return 280;
  }, [chart]);

  const preparedChart = useMemo(() => {
    if (!chart || typeof chart !== "object") {
      return chart;
    }

    const base = chart as { options?: Record<string, any>; height?: number; [key: string]: any };
    const mergedOptions = merge(
      {
        chart: {
          animations: {
            enabled: true,
          },
        },
      },
      base.options ?? {}
    );

    return {
      ...base,
      height: chartHeight,
      options: mergedOptions,
    };
  }, [chart, chartHeight]);

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader
        variant="gradient"
        color={color}
        floated={false}
        shadow={false}
      >
        <div
          ref={containerRef}
          className="tw-w-full tw-min-h-[300px]"
          style={{ minHeight: Math.max(chartHeight, 300) }}
        >
          {ready ? (
            <ReactApexChart {...(preparedChart as any)} width={width || undefined} />
          ) : (
            <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-text-white/80">
              Loading chart…
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody className="tw-px-6 !tw-pt-0">
        <Typography variant="h6" color="blue-gray">
          {title}
        </Typography>
        <Typography
          variant="small"
          className="tw-font-normal tw-text-blue-gray-600"
        >
          {description}
        </Typography>
      </CardBody>
      {footer && (
        <CardFooter className="tw-border-t tw-border-blue-gray-50">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
});

StatisticsChartComponent.displayName = "StatisticsChart";

export const StatisticsChart = StatisticsChartComponent;
export default StatisticsChartComponent;
