export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ApprovalStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const approvalSchema = z.object({
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const json = await readJson(request);
    const parsed = approvalSchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }
    const { approvalStatus } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id: params.id },
        data: { approvalStatus: approvalStatus as ApprovalStatus },
        select: { id: true, code: true },
      });

      let detail: string | null = null;
      switch (approvalStatus) {
        case "APPROVED":
          detail = "Request approved";
          break;
        case "REJECTED":
          detail = "Request rejected";
          break;
        default:
          detail = "Approval reset to pending";
      }

      await tx.requestActivity.create({
        data: {
          requestId: updated.id,
          action: "Approval Updated",
          detail,
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

    console.error("PATCH /api/requests/", params.id, "/approval", error);
    return fail(500, "Server error", error?.message);
  }
}
