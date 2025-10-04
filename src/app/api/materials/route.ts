import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

const createMaterialSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  unit: z.enum(["PC", "KG", "L", "Carton", "Pallet"]),
  category: z.string().min(1),
  warehouseId: z.string().nullable().optional(),
});

type MaterialPayload = z.infer<typeof createMaterialSchema>;

const sortableFields = new Set(["code", "name", "unit", "category", "createdAt", "updatedAt"]);

export async function GET(request: Request) {
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

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = createMaterialSchema.parse(json);

    if (typeof data.warehouseId === "string" && data.warehouseId.length > 0) {
      const warehouseExists = await prisma.warehouse.findUnique({
        where: { id: data.warehouseId },
        select: { id: true },
      });

      if (!warehouseExists) {
        return NextResponse.json({ message: "Warehouse not found" }, { status: 400 });
      }
    }

    const material = await prisma.material.create({
      data: {
        ...data,
        warehouseId:
          typeof data.warehouseId === "string" && data.warehouseId.length > 0
            ? data.warehouseId
            : null,
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : error.meta?.target;
      if (typeof target === "string" && target.includes("name")) {
        return NextResponse.json({ message: "Material name must be unique" }, { status: 409 });
      }
      return NextResponse.json({ message: "Material code must be unique" }, { status: 409 });
    }

    console.error("POST /api/materials", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
