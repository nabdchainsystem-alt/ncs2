export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ApprovalStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const approvalSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "HOLD"]),
});

type ApprovalPayload = z.infer<typeof approvalSchema>;

export async function POST(request: Request) {
  try {
    const body = await readJson<ApprovalPayload>(request);
    const parsed = approvalSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }
    const { id, status } = parsed.data;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { approvalStatus: status as ApprovalStatus },
      select: { id: true },
    });

    return ok({ ok: true, id: updated.id });
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail(404, "Purchase order not found");
    }

    console.error("POST /api/purchase-orders/approval", error);
    return fail(500, "Server error", error?.message);
  }
}
