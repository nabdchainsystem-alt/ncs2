export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

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

    return ok({
      rows: data,
      currency: "SAR",
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/spend/top-vendors", error);
    return fail(500, "Server error", error?.message);
  }
}
