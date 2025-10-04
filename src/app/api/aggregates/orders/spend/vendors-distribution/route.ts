import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(
      {
        labels,
        data,
        currency: "SAR",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/spend/vendors-distribution", error);
    return NextResponse.json({ labels: [], data: [], currency: "SAR" }, { status: 500 });
  }
}
