import { NextResponse } from "next/server";
import { Priority, RequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export async function GET() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + MS_IN_DAY);
  const urgentWindowEnd = endOfDay(new Date(todayStart.getTime() + 3 * MS_IN_DAY));
  const todayEnd = endOfDay(now);

  const [
    newRequestsToday,
    urgentRequestsToday,
    urgentDueSoon,
    followUpDueToday,
    newRequestsYesterday,
    urgentRequestsYesterday,
    totalOpenRequests,
  ] = await Promise.all([
    prisma.request.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.request.count({
      where: {
        priority: Priority.Urgent,
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.request.count({
      where: {
        priority: Priority.Urgent,
        neededBy: {
          gte: todayStart,
          lte: urgentWindowEnd,
        },
      },
    }),
    prisma.request.count({
      where: {
        status: RequestStatus.PENDING,
        neededBy: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),
    prisma.request.count({
      where: {
        createdAt: {
          gte: new Date(todayStart.getTime() - MS_IN_DAY),
          lt: todayStart,
        },
      },
    }),
    prisma.request.count({
      where: {
        priority: Priority.Urgent,
        createdAt: {
          gte: new Date(todayStart.getTime() - MS_IN_DAY),
          lt: todayStart,
        },
      },
    }),
    prisma.request.count({
      where: {
        status: { in: [RequestStatus.OPEN, RequestStatus.PENDING] },
      },
    }),
  ]);

  const delta = (current: number, previous: number) => {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  return NextResponse.json(
    {
      newRequestsToday,
      urgentRequestsToday,
      urgentDueSoon,
      followUpDueToday,
      deltas: {
        newRequestsDelta: delta(newRequestsToday, newRequestsYesterday),
        urgentRequestsDelta: delta(urgentRequestsToday, urgentRequestsYesterday),
        urgentDueSoonDelta: delta(urgentDueSoon, totalOpenRequests),
        followUpDueDelta: delta(followUpDueToday, totalOpenRequests),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
