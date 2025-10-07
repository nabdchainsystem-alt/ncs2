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

    const grouped = await prisma.purchaseOrder.groupBy({
      by: ["vendorId"],
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: limit,
    });

    const vendorIds = grouped.map((entry) => entry.vendorId);
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, nameEn: true },
    });
    const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor.nameEn] as const));

    const rows = grouped.map((entry) => {
      const total = decimalToNumber(entry._sum.total);
      const orders = entry._count._all;
      const aov = orders > 0 ? Number((total / orders).toFixed(2)) : 0;

      return {
        vendor: vendorMap.get(entry.vendorId) ?? "Unknown Vendor",
        orders,
        total,
        aov,
      };
    });

    return ok({
      rows,
      currency: CURRENCY,
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/vendors/spend-top", error);
    return fail(500, "Server error", error?.message);
  }
}
