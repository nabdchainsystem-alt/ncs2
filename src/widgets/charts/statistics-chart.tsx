"use client";

import React, { useMemo } from "react";
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

export function StatisticsChart({
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

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader
        variant="gradient"
        color={color}
        floated={false}
        shadow={false}
      >
        <div ref={containerRef} className="tw-w-full">
          {ready ? (
            <ReactApexChart {...chart} width={width || undefined} />
          ) : (
            <div
              className="tw-grid tw-w-full tw-place-items-center tw-text-white/80"
              style={{ height: chartHeight }}
            >
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
}

export default StatisticsChart;
