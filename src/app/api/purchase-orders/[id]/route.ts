export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  POStatus,
  Prisma,
  Priority,
  TransferInventoryStatus,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const updateSchema = z
  .object({
    status: z.nativeEnum(POStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    receivedAt: z.string().datetime().optional(),
    receivedQty: z.coerce.number().positive().optional(),
  })
  .refine((value) => value.status !== undefined || value.priority !== undefined, {
    message: "At least one field (status or priority) is required",
    path: ["status"],
  });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const paramsResult = paramsSchema.safeParse(await context.params);
    if (!paramsResult.success) {
      return fail(400, "Validation error", paramsResult.error.flatten().fieldErrors);
    }
    const { id } = paramsResult.data;

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
      return fail(404, "Purchase order not found");
    }

    const responseBody = {
      id: po.id,
      poNo: po.poNo,
      quotationNo: po.rfq.quotationNo,
      vendorName: po.vendor.nameEn,
      status: po.status,
      approvalStatus: po.approvalStatus,
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

    return ok(responseBody);
  } catch (error: any) {
    console.error(`GET /api/purchase-orders/:id`, error);
    return fail(500, "Server error", error?.message);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const paramsResult = paramsSchema.safeParse(await context.params);
    if (!paramsResult.success) {
      return fail(400, "Validation error", paramsResult.error.flatten().fieldErrors);
    }
    const { id } = paramsResult.data;

    const payload = await readJson(request);
    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }
    const data = parsed.data;
    const { status, priority, receivedAt, receivedQty } = data;

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
      return fail(404, "Purchase order not found");
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }

    const priorityForInventory = priority ?? existing.priority;
    const receivedAtDate = receivedAt ? new Date(receivedAt) : undefined;
    const receivedQtyDecimal = receivedQty !== undefined ? new Prisma.Decimal(receivedQty) : undefined;

    const updated = await prisma
      .$transaction(async (tx) => {
        const result = await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
          select: { id: true, status: true },
        });

        if (status === POStatus.RECEIVED && existing.status !== POStatus.RECEIVED) {
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

          const itemsToTransfer = existing.items.filter((item) => !existingItemIds.has(item.id));

          let quantityMap: Map<string, Prisma.Decimal> | null = null;
          if (receivedQtyDecimal && itemsToTransfer.length > 0) {
            const totalOrdered = itemsToTransfer.reduce(
              (sum, item) => sum.add(item.qty),
              new Prisma.Decimal(0)
            );

            if (totalOrdered.gt(0)) {
              const ratio = receivedQtyDecimal.div(totalOrdered);
              quantityMap = new Map(
                itemsToTransfer.map((item) => [item.id, item.qty.mul(ratio)])
              );
            } else {
              quantityMap = new Map(
                itemsToTransfer.map((item) => [item.id, receivedQtyDecimal])
              );
            }
          }

          const transfersToCreate = itemsToTransfer.map((item) => {
            const qtyDecimal = quantityMap?.get(item.id) ?? item.qty;
            const unitPriceDecimal = item.unitPrice;
            const lineTotalDecimal = qtyDecimal.mul(unitPriceDecimal);

            return {
              poId: id,
              poItemId: item.id,
              poNo: existing.poNo,
              vendorId: existing.vendor.id,
              vendorName: existing.vendor.nameEn,
              requestPriority:
                existing.rfq.request?.priority ?? priorityForInventory,
              materialCode: item.material?.code ?? null,
              itemName: item.name,
              qty: qtyDecimal,
              unit: item.unit,
              unitPrice: unitPriceDecimal,
              lineTotal: lineTotalDecimal,
              inventoryStatus,
              ...(receivedAtDate ? { createdAt: receivedAtDate } : {}),
            } satisfies Prisma.CompletedOrderTransferCreateManyInput;
          });

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
      return fail(404, "Purchase order not found");
    }

    return ok({ success: true });
  } catch (error: any) {
    console.error(`PATCH /api/purchase-orders/:id`, error);
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof z.ZodError) {
      return fail(400, "Validation error", error.flatten().fieldErrors);
    }
    return fail(500, "Server error", error?.message);
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
