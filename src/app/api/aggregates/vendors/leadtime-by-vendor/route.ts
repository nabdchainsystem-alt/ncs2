import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const transfers = await prisma.completedOrderTransfer.findMany({
      select: {
        vendorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const stats = new Map<string, { totalDays: number; count: number }>();

    transfers.forEach((transfer) => {
      if (!transfer.vendorId) {
        return;
      }
      const diff = transfer.updatedAt.getTime() - transfer.createdAt.getTime();
      const days = Math.max(diff / MS_IN_DAY, 0);
      const record = stats.get(transfer.vendorId) ?? { totalDays: 0, count: 0 };
      record.totalDays += days;
      record.count += 1;
      stats.set(transfer.vendorId, record);
    });

    const vendorIds = Array.from(stats.keys());
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, nameEn: true },
    });
    const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor.nameEn] as const));

    const rows = vendorIds.map((id) => {
      const { totalDays, count } = stats.get(id)!;
      const avg = count > 0 ? Number((totalDays / count).toFixed(2)) : 0;
      return { name: vendorMap.get(id) ?? "Unknown Vendor", avg };
    });

    rows.sort((a, b) => a.avg - b.avg);

    return NextResponse.json(
      {
        labels: rows.map((row) => row.name),
        data: rows.map((row) => row.avg),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/vendors/leadtime-by-vendor", error);
    return NextResponse.json({ labels: [], data: [] }, { status: 500 });
  }
}
