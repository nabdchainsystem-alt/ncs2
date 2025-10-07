export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";

import { orderStatusesBuckets } from "../utils";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const grouped = await prisma.purchaseOrder.groupBy({
      by: ["vendorId", "status"],
      _count: { _all: true },
    });

    const stats = new Map<string, { total: number; delivered: number }>();

    grouped.forEach((entry) => {
      const record = stats.get(entry.vendorId) ?? { total: 0, delivered: 0 };
      record.total += entry._count._all;
      if (orderStatusesBuckets(entry.status) === "Closed") {
        record.delivered += entry._count._all;
      }
      stats.set(entry.vendorId, record);
    });

    const vendorIds = Array.from(stats.keys());
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, nameEn: true },
    });
    const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor.nameEn] as const));

    const rows = vendorIds.map((id) => {
      const { total, delivered } = stats.get(id)!;
      const pct = total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0;
      return { name: vendorMap.get(id) ?? "Unknown Vendor", pct };
    });

    rows.sort((a, b) => b.pct - a.pct);

    return ok({
      labels: rows.map((row) => row.name),
      data: rows.map((row) => row.pct),
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/vendors/ontime-by-vendor", error);
    return fail(500, "Server error", error?.message);
  }
}
