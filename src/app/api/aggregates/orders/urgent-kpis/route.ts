import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalStats, openStats, topSpend] = await Promise.all([
      prisma.purchaseOrder.aggregate({
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          status: { in: ["OPEN", "PARTIAL"] },
        },
        _count: { id: true },
      }),
      prisma.purchaseOrder.groupBy({
        by: ["rfqId"],
        _sum: {
          total: true,
        },
      }),
    ]);

    let topSpendDept = "—";
    let topSpendValue: Prisma.Decimal | null = null;

    for (const entry of topSpend) {
      const rfq = await prisma.rFQ.findUnique({
        where: { id: entry.rfqId },
        select: {
          request: {
            select: {
              department: { select: { name: true } },
            },
          },
        },
      });
      const departmentName = rfq?.request?.department?.name ?? "Unassigned";
      const total = entry._sum.total ?? new Prisma.Decimal(0);
      if (!topSpendValue || total.gt(topSpendValue)) {
        topSpendValue = total;
        topSpendDept = departmentName;
      }
    }

    return NextResponse.json(
      {
        totalOrders: totalStats._count.id ?? 0,
        openOrders: openStats._count.id ?? 0,
        closedOrders: (totalStats._count.id ?? 0) - (openStats._count.id ?? 0),
        topSpendDept,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/urgent-kpis", error);
    return NextResponse.json(
      {
        totalOrders: 0,
        openOrders: 0,
        closedOrders: 0,
        topSpendDept: "—",
      },
      { status: 500 }
    );
  }
}
