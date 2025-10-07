export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma, RequestStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const statusSchema = z.object({
  status: z.enum(["OPEN", "PENDING", "CLOSED", "CANCELLED"]),
});

type RequestDetail = Prisma.RequestGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
    warehouse: { select: { id: true; name: true } };
    machine: { select: { id: true; name: true } };
    vendor: { select: { id: true; nameEn: true } };
    items: {
      include: {
        material: { select: { id: true; name: true, unit: true, code: true } };
      };
    };
  };
}>;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        department: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        vendor: { select: { id: true, nameEn: true } },
        items: {
          include: {
            material: { select: { id: true, name: true, unit: true, code: true } },
          },
        },
      },
    });

    if (!request) {
      return fail(404, "Request not found");
    }

    return ok(request);
  } catch (error: any) {
    console.error("GET /api/requests/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const json = await readJson(request);
    const parsed = statusSchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }
    const { status } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id: params.id },
        data: { status: status as RequestStatus },
        select: { id: true, code: true },
      });

      await tx.requestActivity.create({
        data: {
          requestId: updated.id,
          action: "Status Updated",
          detail: `Status changed to ${status}`,
        },
      });
    });

    return ok({ success: true });
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail(404, "Request not found");
    }

    console.error("PATCH /api/requests/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({
        where: { id: params.id },
        select: { id: true, code: true },
      });

      if (!existing) {
        throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND" });
      }

      await tx.requestActivity.create({
        data: {
          requestId: existing.id,
          action: "Request Deleted",
          detail: `Request ${existing.code} deleted`,
        },
      });

      await tx.requestItem.deleteMany({ where: { requestId: params.id } });
      await tx.requestFollowUp.deleteMany({ where: { requestId: params.id } });
      await tx.request.delete({ where: { id: params.id } });
    });

    return ok({ success: true });
  } catch (error: any) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") ||
      error?.code === "NOT_FOUND"
    ) {
      return fail(404, "Request not found");
    }

    console.error("DELETE /api/requests/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}
