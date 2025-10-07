export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";

const vendorSelect = {
  id: true,
  nameEn: true,
  nameAr: true,
  category: true,
  subCategory: true,
  contactPerson: true,
  position: true,
  phone: true,
  email: true,
  website: true,
  status: true,
  address: true,
  cr: true,
  crExpiry: true,
  vat: true,
  vatExpiry: true,
  bank: true,
  iban: true,
  companyNumber: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VendorSelect;

const updateSchema = z
  .object({
    nameEn: z.string().min(1).optional(),
    nameAr: z.string().optional(),
    category: z.string().min(1).optional(),
    subCategory: z.string().optional(),
    contactPerson: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    address: z.string().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
    cr: z.string().optional(),
    crExpiry: z.string().datetime().optional(),
    vat: z.string().optional(),
    vatExpiry: z.string().datetime().optional(),
    bank: z.string().optional(),
    iban: z.string().optional(),
    companyNumber: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

function decimalToNumber(value?: Prisma.Decimal | null) {
  return value ? Number(value.toFixed(4)) : 0;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const vendor = await prisma.vendor.findUnique({ where: { id }, select: vendorSelect });

    if (!vendor) {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const [purchaseOrdersByStatus, spendAgg, transfers] = await Promise.all([
      prisma.purchaseOrder.groupBy({
        by: ["status"],
        where: { vendorId: id },
        _count: { _all: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: { vendorId: id },
        _sum: { total: true },
      }),
      prisma.completedOrderTransfer.findMany({
        where: { vendorId: id },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    const totalOrders = purchaseOrdersByStatus.reduce((acc, item) => acc + item._count._all, 0);
    const deliveredOrders = purchaseOrdersByStatus
      .filter((item) => item.status === "RECEIVED" || item.status === "CLOSED")
      .reduce((acc, item) => acc + item._count._all, 0);

    const onTimePct = totalOrders > 0 ? Number(((deliveredOrders / totalOrders) * 100).toFixed(2)) : 0;

    const avgLeadDays = (() => {
      if (transfers.length === 0) {
        return 0;
      }

      const totalDays = transfers.reduce((acc, transfer) => {
        const diffMs = transfer.updatedAt.getTime() - transfer.createdAt.getTime();
        const days = diffMs / (1000 * 60 * 60 * 24);
        return acc + Math.max(days, 0);
      }, 0);

      return Number((totalDays / transfers.length).toFixed(2));
    })();

    const payload = {
      ...vendor,
      stats: {
        totalOrders,
        spend: decimalToNumber(spendAgg._sum.total),
        onTimePct,
        avgLeadDays,
      },
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/vendors/[id]", params.id, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json();
    const parsed = updateSchema.parse(json);

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        ...parsed,
        crExpiry: parsed.crExpiry ? new Date(parsed.crExpiry) : undefined,
        vatExpiry: parsed.vatExpiry ? new Date(parsed.vatExpiry) : undefined,
      },
      select: vendorSelect,
    });

    return NextResponse.json(vendor, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid payload", issues: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    console.error("PATCH /api/vendors/", params.id, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.vendor.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    console.error("DELETE /api/vendors/", params.id, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
