import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    location: z.string().nullable().optional(),
    sizeM2: z.number().int().nonnegative().nullable().optional(),
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

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ message: "Warehouse code must be unique" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Warehouse not found" }, { status: 404 });
      }
    }

    console.error("PATCH /api/warehouses/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.warehouse.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Warehouse not found" }, { status: 404 });
    }

    console.error("DELETE /api/warehouses/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
