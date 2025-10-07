import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

import { CURRENCY, decimalToNumber, orderStatusesBuckets } from "../utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK = {
  total: 0,
  active: 0,
  monthlySpend: 0,
  avgOnTimePct: 0,
  currency: CURRENCY,
};

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET() {
  try {
    const [total, active, monthlySpendAgg, grouped] = await Promise.all([
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: "Active" } }),
      prisma.purchaseOrder.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: startOfCurrentMonth() } },
      }),
      prisma.purchaseOrder.groupBy({
        by: ["vendorId", "status"],
        _count: { _all: true },
      }),
    ]);

    const perVendor = new Map<string, { total: number; delivered: number }>();

    grouped.forEach((entry) => {
      const bucket = orderStatusesBuckets(entry.status);
      const existing = perVendor.get(entry.vendorId) ?? { total: 0, delivered: 0 };
      existing.total += entry._count._all;
      if (bucket === "Closed") {
        existing.delivered += entry._count._all;
      }
      perVendor.set(entry.vendorId, existing);
    });

    const vendorWithOrders = Array.from(perVendor.values()).filter((row) => row.total > 0);
    const avgOnTimePct = vendorWithOrders.length
      ? Number(
          (
            vendorWithOrders.reduce((acc, row) => acc + row.delivered / row.total, 0) /
            vendorWithOrders.length *
            100
          ).toFixed(2)
        )
      : 0;

    return NextResponse.json(
      {
        total,
        active,
        monthlySpend: decimalToNumber(monthlySpendAgg._sum.total),
        avgOnTimePct,
        currency: CURRENCY,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/vendors/kpis", error);
    return NextResponse.json(FALLBACK, { status: 500 });
  }
}
