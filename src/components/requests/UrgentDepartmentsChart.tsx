"use client";

import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@/components/MaterialTailwind";
import { VerticalBarChart } from "@/widgets/charts";

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load urgent request analytics");
  }
  return response.json() as Promise<{ labels: string[]; data: number[] }>;
};

export default function UrgentDepartmentsChart() {
  const { data, error, isLoading } = useSWR<{ labels: string[]; data: number[] }>(
    "/api/requests/analytics/urgent-by-department",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const labels = data?.labels ?? [];
  const values = data?.data ?? [];

  const totalUrgent = values.reduce((sum, value) => sum + value, 0);
  const topIndex = values.reduce(
    (best, value, index, array) => (value > array[best] ? index : best),
    0
  );
  const topDepartment = values.length ? labels[topIndex] : null;

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-1 tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6">
        <Typography variant="h6" color="blue-gray">
          Urgent Requests by Department
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          Live distribution of urgent requests across teams
        </Typography>
      </CardHeader>
      <CardBody className="tw-p-4">
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            Unable to load chart data
          </Typography>
        ) : isLoading ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            Loading chart…
          </Typography>
        ) : labels.length === 0 ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            No urgent requests recorded yet.
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
              <Typography variant="h6" color="blue-gray">
                {totalUrgent} urgent requests
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {topDepartment
                  ? `${topDepartment} currently carries the heaviest urgent workload.`
                  : "Monitor departmental workload to keep escalations on track."}
              </Typography>
              <Typography variant="small" className="tw-mt-2 !tw-font-normal !tw-text-blue-gray-400">
                Updated just now
              </Typography>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
