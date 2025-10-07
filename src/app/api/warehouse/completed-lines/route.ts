export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TransferStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

const querySchema = z.object({
  status: z.enum(["pending", "processed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedResult = querySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsedResult.success) {
      return fail(400, "Validation error", parsedResult.error.flatten().fieldErrors);
    }
    const parsed = parsedResult.data;

    const where = parsed.status
      ? {
          transferStatus:
            parsed.status === "pending"
              ? TransferStatus.PENDING
              : TransferStatus.PROCESSED,
        }
      : {};

    const [count, rows] = await Promise.all([
      prisma.completedOrderTransfer.count({ where }),
      prisma.completedOrderTransfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parsed.limit ?? 20,
        include: {
          purchaseOrderItem: {
            include: {
              material: {
                select: { category: true },
              },
            },
          },
          purchaseOrder: {
            include: {
              rfq: {
                include: {
                  request: {
                    include: { warehouse: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const dto = rows.map((row) => ({
      id: row.id,
      poNo: row.poNo,
      vendorName: row.vendorName,
      vendorId: row.vendorId,
      itemName: row.purchaseOrderItem?.name ?? row.itemName,
      materialCode: row.materialCode,
      qty: row.qty.toString(),
      unit: row.unit,
      unitPrice: row.unitPrice.toString(),
      lineTotal: row.lineTotal.toString(),
      requestPriority: row.requestPriority,
      transferStatus: row.transferStatus,
      inventoryStatus: row.inventoryStatus,
      createdAt: row.createdAt.toISOString(),
      category: row.purchaseOrderItem?.material?.category ?? null,
      warehouseName: row.purchaseOrder?.rfq?.request?.warehouse?.name ?? null,
    }));

    return ok({ count, rows: dto });
  } catch (error: any) {
    console.error("GET /api/warehouse/completed-lines", error);
    return fail(500, "Server error", error?.message);
  }
}
