export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

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

    return ok(
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
    );
  } catch (error: any) {
    console.error("GET /api/requests/activities", error);
    return fail(500, "Server error", error?.message);
  }
}
