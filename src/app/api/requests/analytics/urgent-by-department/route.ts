import { NextResponse } from "next/server";
import { Priority } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ labels, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/requests/analytics/urgent-by-department", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
