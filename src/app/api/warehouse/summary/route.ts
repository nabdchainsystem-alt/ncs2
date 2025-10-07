export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TransferInventoryStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

const UNASSIGNED_WAREHOUSE = "Unassigned Warehouse";

function statusKey(status: TransferInventoryStatus) {
  switch (status) {
    case "LOW":
      return "low" as const;
    case "OUT":
      return "out" as const;
    default:
      return "in" as const;
  }
}

export async function GET() {
  try {
    const transfers = await prisma.completedOrderTransfer.findMany({
      include: {
        purchaseOrder: {
          include: {
            rfq: {
              include: {
                request: {
                  include: {
                    warehouse: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const summaryMap = new Map<
      string,
      {
        name: string;
        inStock: number;
        lowStock: number;
        outStock: number;
        totalValueSar: number;
      }
    >();

    for (const transfer of transfers) {
      const warehouseName =
        transfer.purchaseOrder?.rfq?.request?.warehouse?.name ?? UNASSIGNED_WAREHOUSE;

      if (!summaryMap.has(warehouseName)) {
        summaryMap.set(warehouseName, {
          name: warehouseName,
          inStock: 0,
          lowStock: 0,
          outStock: 0,
          totalValueSar: 0,
        });
      }

      const bucket = summaryMap.get(warehouseName)!;

      const status = statusKey(transfer.inventoryStatus);
      const qty = Number(transfer.qty ?? 0) || 0;
      const value = Number(transfer.lineTotal ?? 0) || 0;

      if (status === "in") bucket.inStock += Math.max(qty, 0);
      if (status === "low") bucket.lowStock += Math.max(qty, 0);
      if (status === "out") bucket.outStock += Math.max(qty, 0);

      bucket.totalValueSar += value;
    }

    const data = Array.from(summaryMap.values()).map((item) => ({
      ...item,
      inStock: Number(item.inStock.toFixed(2)),
      lowStock: Number(item.lowStock.toFixed(2)),
      outStock: Number(item.outStock.toFixed(2)),
      totalValueSar: Number(item.totalValueSar.toFixed(2)),
    }));

    return ok({ data });
  } catch (error: any) {
    return fail(500, "Server error", error?.message);
  }
}
