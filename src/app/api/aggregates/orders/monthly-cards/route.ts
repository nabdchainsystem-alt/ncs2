import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(
      {
        totalOrders,
        spendThisMonth,
        changePct,
        currency: "SAR",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/monthly-cards", error);
    return NextResponse.json(
      { totalOrders: 0, spendThisMonth: 0, changePct: 0, currency: "SAR" },
      { status: 500 }
    );
  }
}
