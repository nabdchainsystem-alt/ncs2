import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

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
        request: { select: { id: true, code: true, status: true, priority: true } },
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
    })),
    total,
    page,
    pageSize,
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const vat = parsed.vatPct ?? 15.0;
    const qtyDecimal = new Prisma.Decimal(parsed.qty);
    const unitPriceDecimal = new Prisma.Decimal(parsed.unitPrice);
    const vatDecimal = new Prisma.Decimal(vat);

    const totalExVat = unitPriceDecimal.mul(qtyDecimal);
    const totalIncVat = totalExVat.mul(new Prisma.Decimal(1).add(vatDecimal.div(100)));

    await Promise.all([
      prisma.request.findUniqueOrThrow({ where: { id: parsed.requestId }, select: { id: true } }),
      prisma.vendor.findUniqueOrThrow({ where: { id: parsed.vendorId }, select: { id: true } }),
    ]);

    const quotationNo = `RFQ-${Date.now()}`;

    const created = await prisma.rFQ.create({
      data: {
        quotationNo,
        requestId: parsed.requestId,
        vendorId: parsed.vendorId,
        qty: qtyDecimal,
        unitPrice: unitPriceDecimal,
        vatPct: vatDecimal,
        totalExVat,
        totalIncVat,
        note: parsed.note?.trim() || null,
      },
      select: {
        id: true,
        quotationNo: true,
      },
    });

    await prisma.requestActivity.create({
      data: {
        requestId: parsed.requestId,
        action: "RFQ Created",
        detail: `Quotation ${created.quotationNo} issued for vendor`,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ message: "Quotation number must be unique" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Related entity not found" }, { status: 400 });
      }
    }

    console.error("POST /api/rfqs", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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
};
