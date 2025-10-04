import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

const createVendorSchema = z.object({
  nameEn: z.string().min(1),
  category: z.string().min(1),
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
  nameAr: z.string().optional(),
});

type VendorPayload = z.infer<typeof createVendorSchema>;

const sortableFields = new Set([
  "nameEn",
  "category",
  "contactPerson",
  "phone",
  "email",
  "status",
  "createdAt",
  "updatedAt",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { nameEn: { contains: search } },
          { category: { contains: search } },
          { contactPerson: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
          { status: { contains: search } },
        ],
      }
    : undefined;

  const orderBy = sortField && sortableFields.has(sortField)
    ? { [sortField]: sortDirection ?? "asc" }
    : { createdAt: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.vendor.findMany({ skip, take: pageSize, where, orderBy }),
    prisma.vendor.count({ where }),
  ]);

  const payload: PageDto<typeof rows[number]> = {
    rows,
    total,
    page,
    pageSize,
  };

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = createVendorSchema.parse(json);

    const vendor = await prisma.vendor.create({
      data: {
        ...data,
        crExpiry: data.crExpiry ? new Date(data.crExpiry) : undefined,
        vatExpiry: data.vatExpiry ? new Date(data.vatExpiry) : undefined,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Vendor already exists" }, { status: 409 });
    }

    console.error("POST /api/vendors", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
