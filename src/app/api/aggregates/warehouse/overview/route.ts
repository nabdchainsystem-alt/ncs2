import { NextResponse } from "next/server";
import { TransferInventoryStatus, TransferStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(
      {
        lowStock: lowCount,
        outOfStock: outCount,
        inventoryValueSar:
          valueAggregate._sum.lineTotal?.toNumber() ?? 0,
        totalItems: pendingCount,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/warehouse/overview", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
