import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 10;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(Number(limitParam) || DEFAULT_LIMIT, 1), 50) : DEFAULT_LIMIT;

    const grouped = await prisma.pOItem.groupBy({
      by: ["materialId", "name"],
      _sum: {
        qty: true,
        lineTotal: true,
      },
      _avg: {
        unitPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          lineTotal: "desc",
        },
      },
      take: limit,
    });

    const rows = await Promise.all(
      grouped.map(async (row) => {
        let materialLabel = row.name ?? "Unassigned";
        if (row.materialId) {
          const material = await prisma.material.findUnique({
            where: { id: row.materialId },
            select: { name: true },
          });
          if (material?.name) {
            materialLabel = material.name;
          }
        }

        return {
          material: materialLabel,
          orders: row._count.id,
          total: Number(row._sum.lineTotal ?? new Prisma.Decimal(0)),
          avg: Number(row._avg.unitPrice ?? new Prisma.Decimal(0)),
        };
      })
    );

    return NextResponse.json(
      {
        rows,
        currency: "SAR",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/spend/top-materials", error);
    return NextResponse.json({ rows: [], currency: "SAR" }, { status: 500 });
  }
}
