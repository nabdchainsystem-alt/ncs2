import { NextResponse } from "next/server";
import { RequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalRequests,
      openRequests,
      closedRequests,
      groupedByDepartment,
    ] = await Promise.all([
      prisma.request.count(),
      prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.OPEN, RequestStatus.PENDING],
          },
        },
      }),
      prisma.request.count({
        where: {
          status: RequestStatus.CLOSED,
        },
      }),
      prisma.request.groupBy({
        by: ["departmentId"],
        _count: {
          _all: true,
        },
      }),
    ]);

    const sortedDepartments = [...groupedByDepartment].sort(
      (a, b) => b._count._all - a._count._all
    );

    const topAssigned = sortedDepartments.find((entry) => entry.departmentId);
    let topRequesterDepartment: {
      id: string;
      name: string | null;
      code: string | null;
      requestCount: number;
    } | null = null;

    if (topAssigned?.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: topAssigned.departmentId },
        select: { id: true, name: true, code: true },
      });

      if (department) {
        topRequesterDepartment = {
          ...department,
          requestCount: topAssigned._count._all,
        };
      }
    }

    if (!topRequesterDepartment && sortedDepartments.length > 0) {
      const unassigned = sortedDepartments[0];
      if (!unassigned.departmentId && unassigned._count._all > 0) {
        topRequesterDepartment = {
          id: "unassigned",
          name: "Unassigned",
          code: null,
          requestCount: unassigned._count._all,
        };
      }
    }

    return NextResponse.json(
      {
        totalRequests,
        openRequests,
        closedRequests,
        topRequesterDepartment,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/requests/overview", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
