import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

import { CURRENCY, decimalToNumber } from "../utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? "10") || 10, 50));

    const grouped = await prisma.pOItem.groupBy({
      by: ["materialId", "name"],
      _sum: { lineTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: limit,
    });

    const materialIds = grouped
      .map((item) => item.materialId)
      .filter((id): id is string => Boolean(id));

    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true },
    });

    const materialMap = new Map(materials.map((material) => [material.id, material.name] as const));

    const rows = grouped.map((entry) => {
      const spend = decimalToNumber(entry._sum.lineTotal);
      const orders = entry._count._all;
      const avg = orders > 0 ? Number((spend / orders).toFixed(2)) : 0;

      return {
        material: entry.materialId ? materialMap.get(entry.materialId) ?? entry.name : entry.name,
        orders,
        spend,
        avg,
      };
    });

    return NextResponse.json(
      {
        rows,
        currency: CURRENCY,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/vendors/materials-top", error);
    return NextResponse.json({ rows: [], currency: CURRENCY }, { status: 500 });
  }
}
