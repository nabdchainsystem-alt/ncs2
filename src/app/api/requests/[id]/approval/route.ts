import { NextResponse } from "next/server";
import { ApprovalStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";

const approvalSchema = z.object({
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const json = await request.json();
    const { approvalStatus } = approvalSchema.parse(json);

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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    console.error("PATCH /api/requests/", params.id, "/approval", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
