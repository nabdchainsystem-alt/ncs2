export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";
import { ok, fail, readJson } from "@/server/api-helpers";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  sizeM2: z.number().int().nonnegative().nullable().optional(),
});

const sortableFields = new Set(["name", "code", "location", "sizeM2", "createdAt", "updatedAt"]);

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
            { location: { contains: search } },
          ],
        }
      : undefined;

    const orderBy = sortField && sortableFields.has(sortField)
      ? { [sortField]: sortDirection ?? "asc" }
      : { createdAt: "desc" as const };

    const [rows, total] = await Promise.all([
      prisma.warehouse.findMany({
        skip,
        take: pageSize,
        where,
        orderBy,
      }),
      prisma.warehouse.count({ where }),
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
    const parsed = createWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const warehouse = await prisma.warehouse.create({
      data: {
        name: data.name,
        location: data.location ?? null,
        sizeM2: data.sizeM2 ?? null,
        ...(data.code ? { code: data.code } : {}),
      },
    });

    return ok(warehouse, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "Warehouse code must be unique");
    }

    console.error("POST /api/warehouses", error);
    return fail(500, "Server error", error?.message);
  }
}
