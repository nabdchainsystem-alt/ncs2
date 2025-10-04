import { NextResponse } from "next/server";
import { TransferStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  status: z.enum(["pending", "processed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

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
      }),
    ]);

    const dto = rows.map((row) => ({
      id: row.id,
      poNo: row.poNo,
      vendorName: row.vendorName,
      vendorId: row.vendorId,
      itemName: row.itemName,
      materialCode: row.materialCode,
      qty: row.qty.toString(),
      unit: row.unit,
      unitPrice: row.unitPrice.toString(),
      lineTotal: row.lineTotal.toString(),
      requestPriority: row.requestPriority,
      transferStatus: row.transferStatus,
      inventoryStatus: row.inventoryStatus,
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { count, rows: dto },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/warehouse/completed-lines", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid query" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
