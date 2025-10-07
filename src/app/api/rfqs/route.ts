export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ApprovalStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";
import { ok, fail, readJson } from "@/server/api-helpers";

const createSchema = z.object({
  requestId: z.string().min(1),
  vendorId: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  vatPct: z.number().nonnegative().optional(),
  note: z.string().optional(),
});

const SORTABLE_FIELDS = new Set<keyof Prisma.RFQOrderByWithRelationInput>([
  "quotationNo",
  "createdAt",
  "updatedAt",
  "totalIncVat",
]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
    const requestFilter = url.searchParams.get("requestId") || undefined;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RFQWhereInput = {};

    if (requestFilter) {
      where.requestId = requestFilter;
    }

    if (search) {
      where.OR = [
        { quotationNo: { contains: search } },
        { request: { code: { contains: search } } },
        { vendor: { nameEn: { contains: search } } },
        {
          request: {
            items: {
              some: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { material: { code: { contains: search, mode: "insensitive" } } },
                  { material: { name: { contains: search, mode: "insensitive" } } },
                ],
              },
            },
          },
        },
      ];
    }

    const sortableField = sortField && SORTABLE_FIELDS.has(sortField as keyof Prisma.RFQOrderByWithRelationInput)
      ? (sortField as keyof Prisma.RFQOrderByWithRelationInput)
      : undefined;

    let orderBy: Prisma.RFQOrderByWithRelationInput = { createdAt: "desc" };
    if (sortableField) {
      orderBy = {
        [sortableField]: sortDirection ?? "desc",
      } satisfies Prisma.RFQOrderByWithRelationInput;
    }

    const [rows, total] = await Promise.all([
      prisma.rFQ.findMany({
        skip,
        take: pageSize,
        where,
        orderBy,
        include: {
          request: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              items: {
                select: {
                  name: true,
                  unit: true,
                  qty: true,
                  materialId: true,
                  material: { select: { code: true, name: true } },
                },
                orderBy: { id: "asc" },
                take: 1,
              },
            },
          },
          vendor: { select: { id: true, nameEn: true } },
        },
      }),
      prisma.rFQ.count({ where }),
    ]);

    const payload: PageDto<RFQRow> = {
      rows: rows.map((row) => ({
        id: row.id,
        quotationNo: row.quotationNo,
        createdAt: row.createdAt.toISOString(),
        requestId: row.requestId,
        requestCode: row.request?.code ?? null,
        requestStatus: row.request?.status ?? null,
        requestPriority: row.request?.priority ?? null,
        vendorId: row.vendorId,
        vendorName: row.vendor?.nameEn ?? null,
        qty: row.qty.toNumber(),
        unitPrice: row.unitPrice.toNumber(),
        vatPct: row.vatPct.toNumber(),
        totalExVat: row.totalExVat.toNumber(),
        totalIncVat: row.totalIncVat.toNumber(),
        note: row.note ?? null,
        itemCode: row.request?.items?.[0]?.material?.code ?? null,
        itemName: row.request?.items?.[0]?.material?.name ?? row.request?.items?.[0]?.name ?? null,
        materialId: row.request?.items?.[0]?.materialId ?? null,
      })),
      total,
      page,
      pageSize,
    };

    return ok(payload);
  } catch (error: any) {
    console.error("GET /api/rfqs", error);
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const vat = parsed.data.vatPct ?? 15.0;
    const qtyDecimal = new Prisma.Decimal(parsed.data.qty);
    const unitPriceDecimal = new Prisma.Decimal(parsed.data.unitPrice);
    const vatDecimal = new Prisma.Decimal(vat);

    const totalExVat = unitPriceDecimal.mul(qtyDecimal);
    const totalIncVat = totalExVat.mul(new Prisma.Decimal(1).add(vatDecimal.div(100)));

    const requestRecord = await prisma.request.findUnique({
      where: { id: parsed.data.requestId },
      select: { id: true, approvalStatus: true },
    });

    if (!requestRecord) {
      return fail(404, "Request not found");
    }

    if (requestRecord.approvalStatus !== ApprovalStatus.APPROVED) {
      return fail(400, "Request must be approved before creating an RFQ");
    }

    try {
      await prisma.vendor.findUniqueOrThrow({ where: { id: parsed.data.vendorId }, select: { id: true } });
    } catch (relationError) {
      if (
        relationError instanceof Prisma.PrismaClientKnownRequestError &&
        relationError.code === "P2025"
      ) {
        return fail(404, "Vendor not found");
      }
      if (relationError instanceof Prisma.NotFoundError) {
        return fail(404, "Vendor not found");
      }
      throw relationError;
    }

    const quotationNo = `RFQ-${Date.now()}`;

    const created = await prisma.rFQ.create({
      data: {
        quotationNo,
        requestId: parsed.data.requestId,
        vendorId: parsed.data.vendorId,
        qty: qtyDecimal,
        unitPrice: unitPriceDecimal,
        vatPct: vatDecimal,
        totalExVat,
        totalIncVat,
        note: parsed.data.note?.trim() || null,
      },
      select: {
        id: true,
        quotationNo: true,
      },
    });

    await prisma.requestActivity.create({
      data: {
        requestId: parsed.data.requestId,
        action: "RFQ Created",
        detail: `Quotation ${created.quotationNo} issued for vendor`,
      },
    });

    return ok(created, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return fail(409, "Quotation number must be unique");
      }
      if (error.code === "P2025") {
        return fail(404, "Related entity not found");
      }
    }

    console.error("POST /api/rfqs", error);
    return fail(500, "Server error", error?.message);
  }
}

type RFQRow = {
  id: string;
  quotationNo: string;
  createdAt: string;
  requestId: string;
  requestCode: string | null;
  requestStatus: string | null;
  requestPriority: string | null;
  vendorId: string;
  vendorName: string | null;
  qty: number;
  unitPrice: number;
  vatPct: number;
  totalExVat: number;
  totalIncVat: number;
  note: string | null;
  itemCode: string | null;
  itemName: string | null;
  materialId: string | null;
};
