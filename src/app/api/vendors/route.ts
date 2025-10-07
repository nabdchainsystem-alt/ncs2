export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";
import { ok, fail, readJson } from "@/server/api-helpers";

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
  try {
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

    return ok(payload);
  } catch (error: any) {
    console.error("GET /api/vendors", error);
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const vendor = await prisma.vendor.create({
      data: {
        ...data,
        crExpiry: data.crExpiry ? new Date(data.crExpiry) : undefined,
        vatExpiry: data.vatExpiry ? new Date(data.vatExpiry) : undefined,
      },
      select: listSelect,
    });

    return ok(vendor, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "Vendor already exists");
    }

    console.error("POST /api/vendors", error);
    return fail(500, "Server error", error?.message);
  }
}
