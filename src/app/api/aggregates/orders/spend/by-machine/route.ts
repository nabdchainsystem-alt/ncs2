export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const rows = await prisma.purchaseOrder.groupBy({
      by: ["rfqId"],
      _sum: {
        total: true,
      },
    });

    const totalsByMachine = new Map<string, Prisma.Decimal>();

    for (const row of rows) {
      const rfq = await prisma.rFQ.findUnique({
        where: { id: row.rfqId },
        select: {
          request: {
            select: {
              machine: {
                select: { name: true },
              },
            },
          },
        },
      });

      const machineName = rfq?.request?.machine?.name ?? "Unassigned";
      const current = totalsByMachine.get(machineName) ?? new Prisma.Decimal(0);
      totalsByMachine.set(machineName, current.add(row._sum.total ?? new Prisma.Decimal(0)));
    }

    const grandTotal = Array.from(totalsByMachine.values()).reduce(
      (sum, value) => sum.add(value),
      new Prisma.Decimal(0)
    );

    const result = Array.from(totalsByMachine.entries()).map(([machine, total]) => ({
      machine,
      total: Number(total),
      sharePct: grandTotal.isZero() ? 0 : Number(total.div(grandTotal).mul(100)),
    }));

    return ok({
      rows: result,
      currency: "SAR",
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/spend/by-machine", error);
    return fail(500, "Server error", error?.message);
  }
}
