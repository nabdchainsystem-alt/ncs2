import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") ||
      (error as any)?.code === "NOT_FOUND"
    ) {
      return NextResponse.json({ message: "RFQ not found" }, { status: 404 });
    }

    console.error("DELETE /api/rfqs/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
