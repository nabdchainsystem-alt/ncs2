import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

const createMachineSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  status: z.enum(["Active", "Inactive"]),
  departmentId: z.string().optional(),
  notes: z.string().optional(),
});

type MachinePayload = z.infer<typeof createMachineSchema>;

const sortableFields = new Set(["name", "code", "status", "createdAt", "updatedAt"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { status: { contains: search } },
        ],
      }
    : undefined;

  const orderBy = sortField && sortableFields.has(sortField)
    ? { [sortField]: sortDirection ?? "asc" }
    : { createdAt: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.machine.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.machine.count({ where }),
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
    const data = createMachineSchema.parse(json);

    if (data.departmentId) {
      const departmentExists = await prisma.department.findUnique({
        where: { id: data.departmentId },
        select: { id: true },
      });
      if (!departmentExists) {
        return NextResponse.json({ message: "Department not found" }, { status: 400 });
      }
    }

    const machine = await prisma.machine.create({
      data,
    });

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Machine code must be unique" }, { status: 409 });
    }

    console.error("POST /api/machines", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
