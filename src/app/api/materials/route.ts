export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";
import { ok, fail, readJson } from "@/server/api-helpers";

const createMaterialSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  unit: z.enum(["PC", "KG", "L", "Carton", "Pallet"]),
  category: z.string().min(1),
  minQty: z.coerce.number().min(0),
  warehouseId: z.string().nullable().optional(),
});

const sortableFields = new Set(["code", "name", "unit", "category", "minQty", "createdAt", "updatedAt"]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
    const skip = (page - 1) * pageSize;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { unit: { contains: search } },
            { category: { contains: search } },
          ],
        }
      : undefined;

    const orderBy = sortField && sortableFields.has(sortField)
      ? { [sortField]: sortDirection ?? "asc" }
      : { createdAt: "desc" as const };

    const [rows, total] = await Promise.all([
      prisma.material.findMany({
        skip,
        take: pageSize,
        where,
        orderBy,
        include: {
          warehouse: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.material.count({ where }),
    ]);

    const payload: PageDto<typeof rows[number]> = {
      rows,
      total,
      page,
      pageSize,
    };

    return ok(payload);
  } catch (error: any) {
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const parsed = createMaterialSchema.safeParse(body);
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

    const material = await prisma.material.create({
      data: {
        name: data.name,
        unit: data.unit,
        category: data.category,
        minQty: new Prisma.Decimal(data.minQty),
        warehouseId:
          typeof data.warehouseId === "string" && data.warehouseId.length > 0
            ? data.warehouseId
            : null,
        ...(data.code ? { code: data.code } : {}),
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    });

    return ok(material, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : error.meta?.target;
      if (typeof target === "string" && target.includes("name")) {
        return fail(409, "Material name must be unique");
      }
      return fail(409, "Material code must be unique");
    }

    console.error("POST /api/materials", error);
    return fail(500, "Server error", error?.message);
  }
}
