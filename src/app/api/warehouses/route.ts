import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  location: z.string().nullable().optional(),
  sizeM2: z.number().int().nonnegative().nullable().optional(),
});

type WarehousePayload = z.infer<typeof createWarehouseSchema>;

const sortableFields = new Set(["name", "code", "location", "sizeM2", "createdAt", "updatedAt"]);

export async function GET(request: Request) {
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

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = createWarehouseSchema.parse(json);

    const warehouse = await prisma.warehouse.create({
      data,
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Warehouse code must be unique" }, { status: 409 });
    }

    console.error("POST /api/warehouses", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
