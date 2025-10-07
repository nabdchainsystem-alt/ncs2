export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";
import { ok, fail, readJson } from "@/server/api-helpers";

const createMachineSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  status: z.enum(["Active", "Inactive"]),
  departmentId: z.string().optional(),
  notes: z.string().optional(),
});

const sortableFields = new Set(["name", "code", "status", "createdAt", "updatedAt"]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
    const skip = (page - 1) * pageSize;

    const statusParam = url.searchParams.get("status")?.trim();

    const whereAnd: Prisma.MachineWhereInput[] = [];

    if (search) {
      whereAnd.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { status: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (statusParam && (statusParam === "Active" || statusParam === "Inactive")) {
      whereAnd.push({ status: statusParam });
    }

    const where = whereAnd.length ? { AND: whereAnd } : undefined;

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

    return ok(payload);
  } catch (error: any) {
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const parsed = createMachineSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    if (data.departmentId) {
      const departmentExists = await prisma.department.findUnique({
        where: { id: data.departmentId },
        select: { id: true },
      });
      if (!departmentExists) {
        return fail(400, "Department not found");
      }
    }

    const machine = await prisma.machine.create({
      data: {
        name: data.name,
        status: data.status,
        departmentId: data.departmentId ?? null,
        notes: data.notes ?? null,
        ...(data.code ? { code: data.code } : {}),
      },
    });

    return ok(machine, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "Machine code must be unique");
    }

    console.error("POST /api/machines", error);
    return fail(500, "Server error", error?.message);
  }
}
