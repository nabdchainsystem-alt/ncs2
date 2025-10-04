import { NextResponse } from "next/server";
import { Prisma, RequestStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    return NextResponse.json<RequestDetail>(request, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/requests/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json();
    const { status } = statusSchema.parse(json);

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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    console.error("PATCH /api/requests/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") ||
      (error as any)?.code === "NOT_FOUND"
    ) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    console.error("DELETE /api/requests/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
