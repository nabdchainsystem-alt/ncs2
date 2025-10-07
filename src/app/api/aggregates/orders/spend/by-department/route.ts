export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
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
    });

    const totals = new Map<string, Prisma.Decimal>();

    orders.forEach((order) => {
      const departmentName = order.rfq.request?.department?.name ?? "Unassigned";
      const current = totals.get(departmentName) ?? new Prisma.Decimal(0);
      totals.set(departmentName, current.add(order.total));
    });

    const grandTotal = Array.from(totals.values()).reduce(
      (sum, value) => sum.add(value),
      new Prisma.Decimal(0)
    );

    let topDepartment = "—";
    let topValue = new Prisma.Decimal(0);

    const labels: string[] = [];
    const data: number[] = [];

    totals.forEach((value, key) => {
      labels.push(key);
      data.push(Number(value));
      if (value.gt(topValue)) {
        topValue = value;
        topDepartment = key;
      }
    });

    const topDepartmentPct = grandTotal.isZero() ? 0 : Number(topValue.div(grandTotal).mul(100));

    return ok({
      labels,
      data,
      topDepartment,
      topDepartmentPct,
      currency: "SAR",
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/spend/by-department", error);
    return fail(500, "Server error", error?.message);
  }
}
