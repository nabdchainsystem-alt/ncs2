export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

const FALLBACK = {
  totalOrders: 0,
  openOrders: 0,
  closedOrders: 0,
  topSpendDept: "—",
};

export async function GET() {
  try {
    const [totalOrders, openOrders, closedOrders, orders] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.count({
        where: { status: { in: ["OPEN", "PARTIAL"] } },
      }),
      prisma.purchaseOrder.count({
        where: { status: { in: ["RECEIVED", "CLOSED"] } },
      }),
      prisma.purchaseOrder.findMany({
        select: {
          total: true,
          rfq: {
            select: {
              request: {
                select: {
                  department: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const spendByDept = new Map<string, Prisma.Decimal>();

    orders.forEach((order) => {
      const departmentName = order.rfq.request?.department?.name ?? "Unassigned";
      const current = spendByDept.get(departmentName) ?? new Prisma.Decimal(0);
      spendByDept.set(departmentName, current.add(order.total ?? new Prisma.Decimal(0)));
    });

    let topSpendDept = "—";
    let topValue = new Prisma.Decimal(0);

    spendByDept.forEach((value, name) => {
      if (value.gt(topValue)) {
        topValue = value;
        topSpendDept = name;
      }
    });

    return ok({
      totalOrders,
      openOrders,
      closedOrders,
      topSpendDept,
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/urgent-kpis", error);
    return fail(500, "Server error", error?.message ?? FALLBACK);
  }
}
