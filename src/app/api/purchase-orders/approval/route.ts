export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ApprovalStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";

const approvalSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "HOLD"]),
});

type ApprovalPayload = z.infer<typeof approvalSchema>;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApprovalPayload;
    const { id, status } = approvalSchema.parse(body);

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { approvalStatus: status as ApprovalStatus },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ ok: false, error: "Purchase order not found" }, { status: 404 });
    }

    console.error("POST /api/purchase-orders/approval", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
