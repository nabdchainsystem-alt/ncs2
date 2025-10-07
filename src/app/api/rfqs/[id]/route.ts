export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.rFQ.findUnique({
        where: { id: params.id },
        select: { id: true, requestId: true, quotationNo: true },
      });

      if (!existing) {
        throw Object.assign(new Error("Not found"), { code: "NOT_FOUND" });
      }

      await tx.rFQ.delete({ where: { id: existing.id } });

      await tx.requestActivity.create({
        data: {
          requestId: existing.requestId,
          action: "RFQ Deleted",
          detail: `Quotation ${existing.quotationNo} deleted`,
        },
      });
    });

    return ok({ success: true });
  } catch (error: any) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") ||
      error?.code === "NOT_FOUND"
    ) {
      return fail(404, "RFQ not found");
    }

    console.error("DELETE /api/rfqs/", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}
