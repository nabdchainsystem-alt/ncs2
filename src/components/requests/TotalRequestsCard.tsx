"use client";

import useSWR from "swr";

import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";

import {
  BuildingOfficeIcon,
  ChartPieIcon,
  CheckCircleIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";

type RequestsOverview = {
  totalRequests: number;
  openRequests: number;
  closedRequests: number;
  topRequesterDepartment: {
    id: string;
    name: string | null;
    code: string | null;
    requestCount: number;
  } | null;
};

const numberFormatter = new Intl.NumberFormat();

export default function TotalRequestsCard() {
  const { data, error, isLoading } = useSWR<RequestsOverview>(
    "/api/requests/overview",
    async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load requests overview");
      }
      return response.json();
    },
    { refreshInterval: 60_000 }
  );

  const overview = data ?? {
    totalRequests: 0,
    openRequests: 0,
    closedRequests: 0,
    topRequesterDepartment: null,
  };

  const formatCount = (value: number) =>
    isLoading ? "…" : numberFormatter.format(value);

  const topDepartmentLabel = () => {
    if (isLoading) return "…";
    if (!overview.topRequesterDepartment) return "No data";
    return (
      overview.topRequesterDepartment.name ||
      overview.topRequesterDepartment.code ||
      "Unnamed"
    );
  };

  const topDepartmentSubtitle = error
    ? "Unable to load overview"
    : overview.topRequesterDepartment
    ? `${overview.topRequesterDepartment.requestCount} requests`
    : "Awaiting request activity";

  const commonSubtitle = error ? "Unable to load overview" : undefined;

  return (
    <div className="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-2 xl:tw-grid-cols-4">
      <BlackBoxKpiCard
        icon={<ChartPieIcon className="tw-h-6 tw-w-6" />}
        title="Total Requests"
        value={formatCount(overview.totalRequests)}
        subtitle={commonSubtitle ?? "All time request volume"}
      />
      <BlackBoxKpiCard
        icon={<FolderOpenIcon className="tw-h-6 tw-w-6" />}
        title="Open Requests"
        value={formatCount(overview.openRequests)}
        subtitle={commonSubtitle ?? "Currently in progress"}
      />
      <BlackBoxKpiCard
        icon={<CheckCircleIcon className="tw-h-6 tw-w-6" />}
        title="Closed Requests"
        value={formatCount(overview.closedRequests)}
        subtitle={commonSubtitle ?? "Completed to date"}
      />
      <BlackBoxKpiCard
        icon={<BuildingOfficeIcon className="tw-h-6 tw-w-6" />}
        title="Top Requester Dep"
        value={topDepartmentLabel()}
        subtitle={topDepartmentSubtitle}
      />
    </div>
  );
}
