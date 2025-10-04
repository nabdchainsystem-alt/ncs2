import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 10;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(Number(limitParam) || DEFAULT_LIMIT, 1), 50) : DEFAULT_LIMIT;

    const rows = await prisma.purchaseOrder.groupBy({
      by: ["vendorId"],
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: limit,
    });

    const data = await Promise.all(
      rows.map(async (row) => {
        const vendor = await prisma.vendor.findUnique({
          where: { id: row.vendorId },
          select: { nameEn: true },
        });
        return {
          vendor: vendor?.nameEn ?? "Unassigned",
          orders: row._count.id,
          total: Number(row._sum.total ?? new Prisma.Decimal(0)),
          avg: Number(row._avg.total ?? new Prisma.Decimal(0)),
        };
      })
    );

    return NextResponse.json(
      {
        rows: data,
        currency: "SAR",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/spend/top-vendors", error);
    return NextResponse.json({ rows: [], currency: "SAR" }, { status: 500 });
  }
}
