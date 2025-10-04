"use client";

import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Chip,
} from "@/components/MaterialTailwind";
import { VerticalBarChart } from "@/widgets/charts";

type ResponseData = {
  labels: string[];
  data: number[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    if (response.status === 404) {
      return { labels: [], data: [] } as ResponseData;
    }
    throw new Error("Failed to load orders analytics");
  }
  return response.json() as Promise<ResponseData>;
};

export default function OrdersByDeptChart() {
  const { data, error, isLoading } = useSWR<ResponseData>(
    "/api/aggregates/orders/by-dept-urgent",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const labels = data?.labels ?? [];
  const values = data?.data ?? [];
  const hasData = labels.length > 0 && values.some((value) => value > 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const dominantIndex = values.reduce(
    (highest, value, index, array) => (value > array[highest] ? index : highest),
    0
  );
  const dominantDept = labels[dominantIndex];
  const dominantPct = total > 0 ? Math.round((values[dominantIndex] / total) * 100) : 0;

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm tw-h-full">
      <CardHeader
        floated={false}
        shadow={false}
        className="tw-flex tw-flex-col tw-gap-1"
      >
        <Typography variant="h6" color="blue-gray">
          Urgent Orders by Department
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          Distribution of urgent order volume
        </Typography>
      </CardHeader>
      <CardBody className="tw-space-y-4">
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            Unable to load chart data
          </Typography>
        ) : isLoading ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            Loading chart…
          </Typography>
        ) : !hasData ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            No urgent orders recorded yet.
          </Typography>
        ) : (
          <div className="tw-space-y-4">
            <VerticalBarChart
              height={300}
              colors={["#f87171"]}
              series={[{ name: "Urgent", data: values }]}
              options={{
                xaxis: {
                  categories: labels,
                },
              }}
            />
            <div className="tw-border-t tw-border-blue-gray-50 tw-pt-4">
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                Total urgent orders today
              </Typography>
              <div className="tw-mt-1 tw-flex tw-items-center tw-gap-2">
                <Typography variant="h6" color="blue-gray">
                  {total}
                </Typography>
                {dominantDept ? (
                  <Chip
                    value={`${dominantPct}% ${dominantDept}`}
                    color="red"
                    variant="ghost"
                    className="tw-w-fit tw-text-xs !tw-font-semibold"
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
