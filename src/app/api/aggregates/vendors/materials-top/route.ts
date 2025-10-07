export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";

import { CURRENCY, decimalToNumber } from "../utils";
import { ok, fail } from "@/server/api-helpers";

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

    return ok({
      rows,
      currency: CURRENCY,
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/vendors/materials-top", error);
    return fail(500, "Server error", error?.message);
  }
}
