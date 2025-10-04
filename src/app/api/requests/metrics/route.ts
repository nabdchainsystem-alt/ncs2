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
  const yesterdayStart = new Date(todayStart.getTime() - MS_IN_DAY);
  const yesterdayEnd = endOfDay(new Date(todayStart.getTime() - MS_IN_DAY));
  const urgentPrevWindowStart = new Date(todayStart.getTime() - 3 * MS_IN_DAY);

  const [
    newRequestsToday,
    urgentRequestsToday,
    urgentFollowUpsSoon,
    followUpsDueToday,
    newRequestsYesterday,
    urgentRequestsYesterday,
    totalOpenRequests,
    urgentFollowUpsPrev,
    followUpsDueYesterday,
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
    prisma.requestFollowUp.count({
      where: {
        priority: Priority.Urgent,
        dueDate: {
          gte: todayStart,
          lte: urgentWindowEnd,
        },
      },
    }),
    prisma.requestFollowUp.count({
      where: {
        dueDate: {
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
    prisma.requestFollowUp.count({
      where: {
        priority: Priority.Urgent,
        dueDate: {
          gte: urgentPrevWindowStart,
          lt: todayStart,
        },
      },
    }),
    prisma.requestFollowUp.count({
      where: {
        dueDate: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
      },
    }),
  ]);

  const urgentDueSoon = urgentFollowUpsSoon;
  const followUpDueToday = followUpsDueToday;

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
        urgentDueSoonDelta: delta(urgentDueSoon, urgentFollowUpsPrev),
        followUpDueDelta: delta(followUpDueToday, followUpsDueYesterday),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
