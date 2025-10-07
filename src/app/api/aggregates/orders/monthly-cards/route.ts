export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET() {
  try {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    const lastMonthReference = new Date(thisMonthStart);
    lastMonthReference.setMonth(lastMonthReference.getMonth() - 1);
    const lastMonthStart = startOfMonth(lastMonthReference);
    const lastMonthEnd = endOfMonth(lastMonthReference);

    const [thisMonthOrders, lastMonthOrders] = await Promise.all([
      prisma.purchaseOrder.aggregate({
        where: {
          createdAt: {
            gte: thisMonthStart,
            lte: thisMonthEnd,
          },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);

    const totalOrders = thisMonthOrders._count.id ?? 0;
    const spendThisMonth = Number(thisMonthOrders._sum.total ?? new Prisma.Decimal(0));
    const previousSpend = Number(lastMonthOrders._sum.total ?? new Prisma.Decimal(0));
    const changePct = previousSpend === 0 ? 100 : ((spendThisMonth - previousSpend) / previousSpend) * 100;

    return ok({
      totalOrders,
      spendThisMonth,
      changePct,
      currency: "SAR",
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/monthly-cards", error);
    return fail(500, "Server error", error?.message);
  }
}
