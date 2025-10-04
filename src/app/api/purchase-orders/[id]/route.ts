import { NextResponse } from "next/server";
import {
  POStatus,
  Prisma,
  Priority,
  TransferInventoryStatus,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const updateSchema = z
  .object({
    status: z.nativeEnum(POStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
  })
  .refine((value) => value.status !== undefined || value.priority !== undefined, {
    message: "At least one field (status or priority) is required",
    path: ["status"],
  });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await context.params);

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: { select: { nameEn: true } },
        rfq: { select: { quotationNo: true } },
        items: {
          include: {
            material: { select: { code: true } },
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    const responseBody = {
      id: po.id,
      poNo: po.poNo,
      quotationNo: po.rfq.quotationNo,
      vendorName: po.vendor.nameEn,
      status: po.status,
      priority: po.priority,
      currency: po.currency,
      vatPct: po.vatPct.toFixed(2),
      subtotal: po.subtotal.toFixed(2),
      vatAmount: po.vatAmount.toFixed(2),
      total: po.total.toFixed(2),
      note: po.note,
      createdAt: po.createdAt.toISOString(),
      items: po.items.map((item) => ({
        id: item.id,
        materialCode: item.material?.code ?? null,
        name: item.name,
        qty: item.qty.toFixed(4),
        unit: item.unit,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
        note: item.note,
      })),
    };

    return NextResponse.json(responseBody, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`GET /api/purchase-orders/:id`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await context.params);
    const payload = await request.json();
    const data = updateSchema.parse(payload);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, nameEn: true } },
        rfq: { include: { request: { select: { priority: true } } } },
        items: {
          include: {
            material: { select: { code: true } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    const priorityForInventory = data.priority ?? existing.priority;

    const updated = await prisma
      .$transaction(async (tx) => {
        const result = await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
          select: { id: true, status: true },
        });

        if (
          data.status === POStatus.RECEIVED &&
          existing.status !== POStatus.RECEIVED
        ) {
          const existingTransfers = await tx.completedOrderTransfer.findMany({
            where: { poId: id },
            select: { poItemId: true },
          });
          const existingItemIds = new Set(
            existingTransfers.map((transfer) => transfer.poItemId)
          );

          const inventoryStatus = mapPriorityToInventoryStatus(
            existing.rfq.request?.priority ?? priorityForInventory
          );

          const transfersToCreate = existing.items
            .filter((item) => !existingItemIds.has(item.id))
            .map((item) => ({
              poId: id,
              poItemId: item.id,
              poNo: existing.poNo,
              vendorId: existing.vendor.id,
              vendorName: existing.vendor.nameEn,
              requestPriority:
                existing.rfq.request?.priority ?? priorityForInventory,
              materialCode: item.material?.code ?? null,
              itemName: item.name,
              qty: item.qty,
              unit: item.unit,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              inventoryStatus,
            }));

          if (transfersToCreate.length > 0) {
            await tx.completedOrderTransfer.createMany({
              data: transfersToCreate,
            });
          }
        }

        return result;
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return null;
        }
        throw error;
      });

    if (!updated) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`PATCH /api/purchase-orders/:id`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

function mapPriorityToInventoryStatus(priority: Priority | null | undefined) {
  if (!priority) {
    return TransferInventoryStatus.NORMAL;
  }
  if (priority === Priority.Urgent) {
    return TransferInventoryStatus.OUT;
  }
  if (priority === Priority.High) {
    return TransferInventoryStatus.LOW;
  }
  return TransferInventoryStatus.NORMAL;
}
