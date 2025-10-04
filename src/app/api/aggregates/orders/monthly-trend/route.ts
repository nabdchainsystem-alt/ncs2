import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const labels: string[] = [];
    const ordersSeries: number[] = [];
    const spendSeries: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      labels.push(start.toLocaleString("default", { month: "short" }));

      const aggregate = await prisma.purchaseOrder.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
        _sum: { total: true },
      });

      ordersSeries.push(aggregate._count.id ?? 0);
      spendSeries.push(Number(aggregate._sum.total ?? new Prisma.Decimal(0)));
    }

    return NextResponse.json(
      {
        labels,
        series: [
          { name: "Orders", data: ordersSeries },
          { name: "Spend (SAR)", data: spendSeries },
        ],
        currency: "SAR",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/monthly-trend", error);
    return NextResponse.json(
      {
        labels: [],
        series: [
          { name: "Orders", data: [] },
          { name: "Spend (SAR)", data: [] },
        ],
        currency: "SAR",
      },
      { status: 500 }
    );
  }
}
