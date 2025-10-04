"use client";

import React from "react";
import useSWR from "swr";

import {
  Card,
  CardBody,
  CardHeader,
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
  ArrowPathIcon,
  CheckCircleIcon,
  TrashIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";

type IconComponent = React.ComponentType<React.ComponentProps<typeof PlusCircleIcon>>;

type RequestStatusValue = "OPEN" | "PENDING" | "CLOSED" | "CANCELLED";
type PriorityValue = "Low" | "Normal" | "High" | "Urgent";

const iconMap: Record<string, IconComponent> = {
  "Request Created": PlusCircleIcon,
  "Status Updated": ArrowPathIcon,
  "Request Deleted": TrashIcon,
};

const statusColorMap: Record<RequestStatusValue, string> = {
  OPEN: "tw-bg-blue-500",
  PENDING: "tw-bg-amber-500",
  CLOSED: "tw-bg-green-500",
  CANCELLED: "tw-bg-red-500",
};

type Activity = {
  id: string;
  requestId: string | null;
  code: string | null;
  status: RequestStatusValue | null;
  priority: PriorityValue | null;
  action: string;
  detail: string | null;
  createdAt: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch request activities");
  }
  return response.json() as Promise<Activity[]>;
};

export default function RecentActivities() {
  const { data, error } = useSWR<Activity[]>("/api/requests/activities", fetcher, {
    refreshInterval: 60_000,
  });

  const activities = data ?? [];

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader floated={false} shadow={false} color="transparent">
        <Typography variant="h6" color="blue-gray" className="tw-mb-2">
          Recent Activities
        </Typography>
        <Typography
          variant="small"
          className="!tw-font-normal !tw-text-blue-gray-500"
        >
          Latest changes across requests
        </Typography>
      </CardHeader>
      <CardBody>
        {error ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            Unable to load request activities
          </Typography>
        ) : activities.length === 0 ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            No recent activity yet.
          </Typography>
        ) : (
          <Timeline>
            {activities.map((activity, idx) => {
              const Icon = iconMap[activity.action] ?? (CheckCircleIcon as IconComponent);
              const statusColor =
                (activity.status && statusColorMap[activity.status as RequestStatusValue]) ||
                "tw-bg-blue-gray-200";
              const priorityChipColor =
                activity.priority === "Urgent"
                  ? "red"
                  : activity.priority === "High"
                  ? "amber"
                  : activity.priority === "Low"
                  ? "green"
                  : "blue";

              return (
                <TimelineItem key={activity.id}>
                  {idx !== activities.length - 1 && (
                    <TimelineConnector className="!tw-scale-y-125 !tw-opacity-50" />
                  )}
                  <TimelineHeader>
                    <TimelineIcon className={`tw-p-2 ${statusColor}`}>
                      <Icon className="tw-h-4 tw-w-4 tw-text-white" />
                    </TimelineIcon>
                    <div className="tw-flex tw-flex-col tw-gap-1">
                      <Typography variant="small" color="blue-gray" className="!tw-font-medium">
                        {activity.action}
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
                        {activity.priority ? (
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
                  {idx !== activities.length - 1 && <TimelineBody>&nbsp;</TimelineBody>}
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </CardBody>
    </Card>
  );
}
