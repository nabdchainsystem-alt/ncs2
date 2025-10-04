import { Priority } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function aggregateUrgentByDepartment() {
  const urgentOrders = await prisma.purchaseOrder.findMany({
    where: { priority: Priority.Urgent },
    include: {
      rfq: {
        select: {
          request: {
            select: {
              department: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  const counts = new Map<string, number>();

  urgentOrders.forEach((order) => {
    const departmentName = order.rfq.request?.department?.name ?? "Unassigned";
    counts.set(departmentName, (counts.get(departmentName) ?? 0) + 1);
  });

  const labels = Array.from(counts.keys());
  const data = labels.map((label) => counts.get(label) ?? 0);

  return { labels, data };
}

export async function computeUrgentKpis() {
  const [openUrgent, closedUrgent, departmentsWithUrgent, totalDepartments] = await Promise.all([
    prisma.purchaseOrder.count({
      where: {
        priority: Priority.Urgent,
        status: { in: ["OPEN", "PARTIAL"] },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        priority: Priority.Urgent,
        status: { in: ["RECEIVED", "CLOSED"] },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { priority: Priority.Urgent },
      select: {
        rfq: {
          select: {
            request: {
              select: { departmentId: true },
            },
          },
        },
      },
    }),
    prisma.department.count(),
  ]);

  const deptSet = new Set(
    departmentsWithUrgent
      .map((item) => item.rfq.request?.departmentId)
      .filter((value): value is string => Boolean(value))
  );

  const completedUrgent = await prisma.purchaseOrder.findMany({
    where: {
      priority: Priority.Urgent,
      status: { in: ["RECEIVED", "CLOSED"] },
      rfq: {
        request: {
          neededBy: { not: null },
        },
      },
    },
    select: {
      updatedAt: true,
      rfq: {
        select: {
          request: {
            select: {
              neededBy: true,
            },
          },
        },
      },
    },
  });

  const onTimeCount = completedUrgent.filter((order) => {
    const neededBy = order.rfq.request?.neededBy;
    if (!neededBy) return false;
    return order.updatedAt.getTime() <= neededBy.getTime();
  }).length;

  const onTimePct = completedUrgent.length === 0 ? 0 : (onTimeCount / completedUrgent.length) * 100;

  return {
    openUrgent,
    closedUrgent,
    onTimePct,
    urgentPerDept: {
      current: deptSet.size,
      totalDepts: totalDepartments,
    },
  };
}

type RangeDescriptor = {
  label: string;
  start: Date;
  end: Date;
};

function buildMonthlyRanges(now: Date, monthsBack = 6) {
  const ranges: RangeDescriptor[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleString("default", { month: "short" });
    ranges.push({ label, start, end });
  }
  return ranges;
}

function buildWeeklyRanges(now: Date, weeksBack = 8) {
  const ranges: RangeDescriptor[] = [];
  const endOfWeek = (date: Date) => {
    const result = new Date(date);
    const day = result.getDay();
    const diff = 6 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(23, 59, 59, 999);
    return result;
  };

  const startOfWeek = (date: Date) => {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  let cursor = startOfWeek(now);
  for (let i = 0; i < weeksBack; i++) {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const end = endOfWeek(start);
    const label = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    ranges.unshift({ label, start, end });
    cursor.setDate(cursor.getDate() - 7);
  }
  return ranges;
}

function buildDailyRanges(now: Date, daysBack = 14) {
  const ranges: RangeDescriptor[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    const label = day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    ranges.push({ label, start, end });
  }
  return ranges;
}

async function computeSeriesForRanges(ranges: RangeDescriptor[]) {
  const labels: string[] = [];
  const series = {
    total: [] as number[],
    overSla: [] as number[],
    withinSla: [] as number[],
    completed: [] as number[],
    pending: [] as number[],
  };

  for (const range of ranges) {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        priority: Priority.Urgent,
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: {
        rfq: {
          select: {
            request: {
              select: {
                neededBy: true,
              },
            },
          },
        },
      },
    });

    const total = orders.length;
    let overSla = 0;
    let withinSla = 0;
    let completed = 0;
    let pending = 0;

    orders.forEach((order) => {
      const neededBy = order.rfq.request?.neededBy;
      const isCompleted = order.status === "RECEIVED" || order.status === "CLOSED";

      if (neededBy) {
        if (isCompleted && order.updatedAt.getTime() <= neededBy.getTime()) {
          withinSla += 1;
        } else if (neededBy.getTime() < new Date().getTime()) {
          overSla += 1;
        } else {
          withinSla += 1;
        }
      }

      if (isCompleted) {
        completed += 1;
      } else {
        pending += 1;
      }
    });

    labels.push(range.label);
    series.total.push(total);
    series.overSla.push(overSla);
    series.withinSla.push(withinSla);
    series.completed.push(completed);
    series.pending.push(pending);
  }

  return {
    labels,
    series: [
      { name: "Total", data: series.total },
      { name: "Over SLA", data: series.overSla },
      { name: "Within SLA", data: series.withinSla },
      { name: "Completed", data: series.completed },
      { name: "Pending", data: series.pending },
    ],
  };
}

export async function computeUrgentStatusSeries(period: "daily" | "weekly" | "monthly" = "monthly") {
  const now = new Date();
  if (period === "weekly") {
    return computeSeriesForRanges(buildWeeklyRanges(now));
  }
  if (period === "daily") {
    return computeSeriesForRanges(buildDailyRanges(now));
  }
  return computeSeriesForRanges(buildMonthlyRanges(now));
}
