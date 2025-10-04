"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
  IconButton,
  Timeline,
  TimelineBody,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineItem,
  Typography,
  Chip,
} from "@/components/MaterialTailwind";
import {
  PencilSquareIcon,
  PlusCircleIcon,
  ReceiptPercentIcon,
  TrashIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const iconMap: Record<string, typeof PlusCircleIcon> = {
  ORDER_CREATED: PlusCircleIcon,
  ORDER_UPDATED: PencilSquareIcon,
  ORDER_CANCELLED: XCircleIcon,
  ORDER_COMPLETED: CheckCircleIcon,
  RFQ_CREATED: ReceiptPercentIcon,
  RFQ_DELETED: TrashIcon,
};

type OrderActivity = {
  id: string;
  code: string | null;
  action: string;
  status: string | null;
  priority: string | null;
  detail: string | null;
  createdAt: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    if (response.status === 404) {
      return [] as OrderActivity[];
    }
    throw new Error("Failed to load order activities");
  }
  return response.json() as Promise<OrderActivity[]>;
};

export default function OrdersRecentActivity() {
  const { data, error } = useSWR<OrderActivity[]>(
    "/api/orders/activities?take=40",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const activities = data ?? [];
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage((prev) => Math.min(prev, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const offset = page * pageSize;
  const visibleActivities = activities.slice(offset, offset + pageSize);

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm tw-h-full">
      <CardHeader
        floated={false}
        shadow={false}
        className="tw-flex tw-items-start tw-justify-between tw-gap-3"
      >
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h6" color="blue-gray">
            Recent Activities
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Latest changes across orders
          </Typography>
        </div>
        <div className="tw-flex tw-items-center tw-gap-2">
          <IconButton
            variant="text"
            color="blue-gray"
            size="sm"
            aria-label="Previous"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0}
          >
            <ChevronLeftIcon className="tw-h-4 tw-w-4" />
          </IconButton>
          <IconButton
            variant="text"
            color="blue-gray"
            size="sm"
            aria-label="Next"
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRightIcon className="tw-h-4 tw-w-4" />
          </IconButton>
        </div>
      </CardHeader>
      <CardBody className="tw-space-y-4">
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            Unable to load order activities
          </Typography>
        ) : activities.length === 0 ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            No recent activity yet.
          </Typography>
        ) : (
          <>
            <Timeline>
              {visibleActivities.map((activity, index) => {
                const Icon = iconMap[activity.action] ?? PlusCircleIcon;
                const showConnector = index < visibleActivities.length - 1;
                const statusColor = activity.status === "CANCELLED"
                  ? "tw-bg-red-500"
                  : activity.status === "COMPLETED" || activity.status === "CLOSED"
                  ? "tw-bg-green-500"
                  : activity.status === "IN_PROGRESS"
                  ? "tw-bg-blue-500"
                  : "tw-bg-blue-gray-200";

                const priorityChipColor =
                  activity.priority === "Urgent"
                    ? "red"
                    : activity.priority === "High"
                    ? "amber"
                    : activity.priority === "Normal"
                    ? "blue"
                    : activity.priority === "Low"
                    ? "blue-gray"
                    : undefined;

                return (
                  <TimelineItem key={activity.id}>
                    {showConnector ? (
                      <TimelineConnector className="!tw-scale-y-125 !tw-opacity-50" />
                    ) : null}
                    <TimelineHeader>
                      <TimelineIcon className={`tw-p-2 ${statusColor}`}>
                        <Icon className="tw-h-4 tw-w-4 tw-text-white" />
                      </TimelineIcon>
                      <div className="tw-flex tw-flex-col tw-gap-1">
                        <Typography variant="small" color="blue-gray" className="!tw-font-medium">
                          {activity.action.replace(/_/g, " ")}
                        </Typography>
                        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                          {activity.code ? (
                            <Chip
                              value={activity.code}
                              color="blue"
                              variant="ghost"
                              className="tw-h-6 tw-w-fit tw-text-xs !tw-font-semibold"
                            />
                          ) : null}
                          {activity.priority && priorityChipColor ? (
                            <Chip
                              value={activity.priority}
                              color={priorityChipColor}
                              variant="ghost"
                              className="tw-h-6 tw-w-fit tw-text-xs !tw-font-semibold tw-capitalize"
                            />
                          ) : null}
                          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                            {new Date(activity.createdAt).toLocaleString()}
                          </Typography>
                        </div>
                        {activity.detail ? (
                          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                            {activity.detail}
                          </Typography>
                        ) : null}
                      </div>
                    </TimelineHeader>
                    {showConnector ? <TimelineBody>&nbsp;</TimelineBody> : null}
                  </TimelineItem>
                );
              })}
            </Timeline>
            {activities.length > 4 ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                Showing latest 4 updates.
              </Typography>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
