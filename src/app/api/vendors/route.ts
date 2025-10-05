import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createVendorSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.string().min(1),
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
});

type VendorPayload = z.infer<typeof createVendorSchema>;

const SORTABLE_FIELDS = new Set([
  "nameEn",
  "category",
  "status",
  "contactPerson",
  "createdAt",
]);

const listSelect = {
  id: true,
  nameEn: true,
  category: true,
  status: true,
  contactPerson: true,
  phone: true,
  email: true,
  createdAt: true,
} satisfies Prisma.VendorSelect;

type VendorListRow = Prisma.VendorGetPayload<{ select: typeof listSelect }>;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
  const statusParam = url.searchParams.get("status")?.trim();
  const categoryParam = url.searchParams.get("category")?.trim();

  const skip = (page - 1) * pageSize;

  const whereAnd: Prisma.VendorWhereInput[] = [];

  if (search) {
    whereAnd.push({
      OR: [
        { nameEn: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (statusParam && (statusParam === "Active" || statusParam === "Inactive")) {
    whereAnd.push({ status: statusParam });
  }

  if (categoryParam) {
    whereAnd.push({ category: { equals: categoryParam } });
  }

  const where = whereAnd.length ? { AND: whereAnd } : undefined;

  const sortableField = sortField && SORTABLE_FIELDS.has(sortField) ? sortField : undefined;

  const orderBy: Prisma.VendorOrderByWithRelationInput = sortableField
    ? { [sortableField]: sortDirection ?? "asc" }
    : { createdAt: "desc" };

  try {
    const [records, total] = await Promise.all([
      prisma.vendor.findMany({
        skip,
        take: pageSize,
        where,
        orderBy,
        select: listSelect,
      }),
      prisma.vendor.count({ where }),
    ]);

    const payload: PageDto<VendorListRow> = {
      rows: records,
      total,
      page,
      pageSize,
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/vendors", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
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
      select: listSelect,
    });

    return NextResponse.json(vendor, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid payload", issues: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Vendor already exists" },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    console.error("POST /api/vendors", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
