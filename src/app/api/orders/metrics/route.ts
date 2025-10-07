export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Priority } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  result.setMilliseconds(result.getMilliseconds() - 1);
  return result;
}

export async function GET() {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const threeDaysAhead = new Date(now);
    threeDaysAhead.setDate(now.getDate() + 3);

    const [newOrdersToday, urgentOrdersToday, timeCriticalOrders, followUpsDueToday] = await Promise.all([
      prisma.purchaseOrder.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.purchaseOrder.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          priority: Priority.Urgent,
        },
      }),
      prisma.purchaseOrder.count({
        where: {
          rfq: {
            request: {
              neededBy: {
                gte: now,
                lte: threeDaysAhead,
              },
            },
          },
        },
      }),
      prisma.purchaseOrderFollowUp.count({
        where: {
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: { not: "Completed" },
        },
      }),
    ]);

    return ok({
      newOrdersToday,
      urgentOrdersToday,
      timeCriticalOrders,
      followUpsDueToday,
    });
  } catch (error: any) {
    console.error("GET /api/orders/metrics", error);
    return fail(500, "Server error", error?.message);
  }
}
