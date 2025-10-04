import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

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
    companyNumber: z.string().optional(),
    address: z.string().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
    cr: z.string().optional(),
    crExpiry: z.string().datetime().optional(),
    vat: z.string().optional(),
    vatExpiry: z.string().datetime().optional(),
    bank: z.string().optional(),
    iban: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

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
    });

    return NextResponse.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    console.error("PATCH /api/vendors/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.vendor.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    console.error("DELETE /api/vendors/", params.id, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
