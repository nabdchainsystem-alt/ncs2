export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["RECEIVED", "CLOSED"] },
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

    let onTime = 0;
    let delayed = 0;

    orders.forEach((order) => {
      const neededBy = order.rfq?.request?.neededBy;
      if (!neededBy) return;
      if (order.updatedAt.getTime() <= neededBy.getTime()) {
        onTime += 1;
      } else {
        delayed += 1;
      }
    });

    return ok({
      labels: ["On-Time", "Delayed"],
      data: [onTime, delayed],
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/delivery/outcomes", error);
    return fail(500, "Server error", error?.message);
  }
}
