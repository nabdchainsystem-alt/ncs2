import { NextResponse } from "next/server";
import { Priority } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const RANGE_WINDOWS = {
  weekly: 7,
  monthly: 30,
} as const;

type RangeKey = keyof typeof RANGE_WINDOWS;

type GroupedResult = Array<{
  departmentId: string | null;
  _count: {
    _all: number;
  };
}>;

type SeriesEntry = {
  id: string;
  label: string;
  count: number;
};

function getRangeStart(range: RangeKey) {
  const now = Date.now();
  const window = RANGE_WINDOWS[range];
  return new Date(now - window * MS_IN_DAY);
}

async function resolveDepartments(groups: GroupedResult) {
  const departmentIds = groups
    .map((entry) => entry.departmentId)
    .filter((id): id is string => Boolean(id));

  if (!departmentIds.length) {
    return new Map<string, { name: string | null; code: string | null }>();
  }

  const departments = await prisma.department.findMany({
    where: { id: { in: departmentIds } },
    select: { id: true, name: true, code: true },
  });

  return new Map(departments.map((dept) => [dept.id, { name: dept.name, code: dept.code }]));
}

function toSeries(groups: GroupedResult, departmentMap: Map<string, { name: string | null; code: string | null }>): SeriesEntry[] {
  return groups.map((entry) => {
    const { departmentId, _count } = entry;
    const department = departmentId ? departmentMap.get(departmentId) : null;
    const label = department?.name ?? department?.code ?? "Unassigned";
    return {
      id: departmentId ?? "unassigned",
      label,
      count: _count._all,
    };
  });
}

export async function GET() {
  try {
    const [weeklyTotal, monthlyTotal, weeklyUrgent, monthlyUrgent] = await Promise.all([
      prisma.request.groupBy({
        by: ["departmentId"],
        where: {
          createdAt: {
            gte: getRangeStart("weekly"),
          },
        },
        _count: { _all: true },
      }),
      prisma.request.groupBy({
        by: ["departmentId"],
        where: {
          createdAt: {
            gte: getRangeStart("monthly"),
          },
        },
        _count: { _all: true },
      }),
      prisma.request.groupBy({
        by: ["departmentId"],
        where: {
          priority: Priority.Urgent,
          createdAt: {
            gte: getRangeStart("weekly"),
          },
        },
        _count: { _all: true },
      }),
      prisma.request.groupBy({
        by: ["departmentId"],
        where: {
          priority: Priority.Urgent,
          createdAt: {
            gte: getRangeStart("monthly"),
          },
        },
        _count: { _all: true },
      }),
    ]);

    const departmentMap = await resolveDepartments([
      ...weeklyTotal,
      ...monthlyTotal,
      ...weeklyUrgent,
      ...monthlyUrgent,
    ]);

    const serialize = (groups: GroupedResult) => toSeries(groups, departmentMap);

    return NextResponse.json(
      {
        total: {
          weekly: serialize(weeklyTotal),
          monthly: serialize(monthlyTotal),
        },
        urgent: {
          weekly: serialize(weeklyUrgent),
          monthly: serialize(monthlyUrgent),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/requests/analytics/department-activity", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
