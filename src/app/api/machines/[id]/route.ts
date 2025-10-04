import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
    departmentId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
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
    const parsed = updateSchema.parse(json);

    if (parsed.departmentId) {
      const departmentExists = await prisma.department.findUnique({
        where: { id: parsed.departmentId },
        select: { id: true },
      });
      if (!departmentExists) {
        return NextResponse.json({ message: "Department not found" }, { status: 400 });
      }
    }

    const machine = await prisma.machine.update({
      where: { id: params.id },
      data: {
        ...parsed,
        departmentId: parsed.departmentId ?? undefined,
        notes: parsed.notes ?? undefined,
      },
    });

    return NextResponse.json(machine);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ message: "Machine code must be unique" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Machine not found" }, { status: 404 });
      }
    }

    console.error("PATCH /api/machines/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.machine.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Machine not found" }, { status: 404 });
    }

    console.error("DELETE /api/machines/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
