import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const updateSchema = z
  .object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    unit: z.enum(["PC", "KG", "L", "Carton", "Pallet"]).optional(),
    category: z.string().min(1).optional(),
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
    const json = await request.json();
    const data = updateSchema.parse(json);

    if (typeof data.warehouseId === "string" && data.warehouseId.length > 0) {
      const warehouseExists = await prisma.warehouse.findUnique({
        where: { id: data.warehouseId },
        select: { id: true },
      });
      if (!warehouseExists) {
        return NextResponse.json({ message: "Warehouse not found" }, { status: 400 });
      }
    }

    const material = await prisma.material.update({
      where: { id: params.id },
      data: {
        ...data,
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

    return NextResponse.json(material);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : error.meta?.target;
        if (typeof target === "string" && target.includes("name")) {
          return NextResponse.json({ message: "Material name must be unique" }, { status: 409 });
        }
        return NextResponse.json({ message: "Material code must be unique" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Material not found" }, { status: 404 });
      }
    }

    console.error("PATCH /api/materials/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.material.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Material not found" }, { status: 404 });
    }

    console.error("DELETE /api/materials/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
