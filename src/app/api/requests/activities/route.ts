import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const activities = await prisma.requestActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        request: {
          select: {
            id: true,
            code: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    return NextResponse.json(
      activities.map((activity) => ({
        id: activity.id,
        requestId: activity.requestId,
        code: activity.request?.code ?? null,
        status: activity.request?.status ?? null,
        priority: activity.request?.priority ?? null,
        action: activity.action,
        detail: activity.detail,
        createdAt: activity.createdAt,
      })),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/requests/activities", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
