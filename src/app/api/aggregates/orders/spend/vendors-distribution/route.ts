export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const rows = await prisma.purchaseOrder.groupBy({
      by: ["vendorId"],
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 10,
    });

    const labels: string[] = [];
    const data: number[] = [];

    for (const row of rows) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: row.vendorId },
        select: { nameEn: true },
      });
      labels.push(vendor?.nameEn ?? "Unassigned");
      data.push(Number(row._sum.total ?? new Prisma.Decimal(0)));
    }

    return ok({
      labels,
      data,
      currency: "SAR",
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/spend/vendors-distribution", error);
    return fail(500, "Server error", error?.message);
  }
}
