export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Priority } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const grouped = await prisma.request.groupBy({
      by: ["departmentId"],
      where: {
        priority: Priority.Urgent,
      },
      _count: {
        _all: true,
      },
    });

    const departmentIds = grouped
      .map((entry) => entry.departmentId)
      .filter((id): id is string => Boolean(id));

    const departments = departmentIds.length
      ? await prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    const departmentMap = new Map(departments.map((dept) => [dept.id, dept]));

    const labels: string[] = [];
    const data: number[] = [];

    grouped.forEach((entry) => {
      const dept = entry.departmentId ? departmentMap.get(entry.departmentId) : null;
      labels.push(dept ? dept.name ?? dept.code ?? "Unassigned" : "Unassigned");
      data.push(entry._count._all);
    });

    return ok({ labels, data });
  } catch (error: any) {
    console.error("GET /api/requests/analytics/urgent-by-department", error);
    return fail(500, "Server error", error?.message);
  }
}
