export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const updateSchema = z
  .object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    unit: z.enum(["PC", "KG", "L", "Carton", "Pallet"]).optional(),
    category: z.string().min(1).optional(),
    minQty: z.coerce.number().min(0).optional(),
    warehouseId: z.string().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const json = await readJson(request);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    if (typeof data.warehouseId === "string" && data.warehouseId.length > 0) {
      const warehouseExists = await prisma.warehouse.findUnique({
        where: { id: data.warehouseId },
        select: { id: true },
      });
      if (!warehouseExists) {
        return fail(400, "Warehouse not found");
      }
    }

    const material = await prisma.material.update({
      where: { id: params.id },
      data: {
        ...data,
        minQty: data.minQty !== undefined ? new Prisma.Decimal(data.minQty) : undefined,
        warehouseId:
          data.warehouseId === undefined
            ? undefined
            : typeof data.warehouseId === "string" && data.warehouseId.length > 0
            ? data.warehouseId
            : null,
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    });

    return ok(material);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : error.meta?.target;
        if (typeof target === "string" && target.includes("name")) {
          return fail(409, "Material name must be unique");
        }
        return fail(409, "Material code must be unique");
      }
      if (error.code === "P2025") {
        return fail(404, "Material not found");
      }
    }

    console.error("PATCH /api/materials/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.material.delete({ where: { id: params.id } });
    return ok({ success: true });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail(404, "Material not found");
    }

    console.error("DELETE /api/materials/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}
