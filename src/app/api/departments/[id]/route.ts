export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    location: z.string().nullable().optional(),
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

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.code ? { code: data.code } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
      },
    });

    return ok(department);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return fail(409, "Department code must be unique");
      }
      if (error.code === "P2025") {
        return fail(404, "Department not found");
      }
    }

    console.error("PATCH /api/departments/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.department.delete({ where: { id: params.id } });
    return ok({ success: true });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail(404, "Department not found");
    }

    console.error("DELETE /api/departments/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}
