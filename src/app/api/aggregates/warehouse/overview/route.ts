export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TransferInventoryStatus, TransferStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const [pendingCount, lowCount, outCount, valueAggregate] = await Promise.all([
      prisma.completedOrderTransfer.count({
        where: { transferStatus: TransferStatus.PENDING },
      }),
      prisma.completedOrderTransfer.count({
        where: {
          transferStatus: TransferStatus.PENDING,
          inventoryStatus: TransferInventoryStatus.LOW,
        },
      }),
      prisma.completedOrderTransfer.count({
        where: {
          transferStatus: TransferStatus.PENDING,
          inventoryStatus: TransferInventoryStatus.OUT,
        },
      }),
      prisma.completedOrderTransfer.aggregate({
        _sum: { lineTotal: true },
        where: { transferStatus: TransferStatus.PENDING },
      }),
    ]);

    return ok({
      lowStock: lowCount,
      outOfStock: outCount,
      inventoryValueSar: valueAggregate._sum.lineTotal?.toNumber() ?? 0,
      totalItems: pendingCount,
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/warehouse/overview", error);
    return fail(500, "Server error", error?.message);
  }
}
