import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["RECEIVED", "CLOSED"] },
      },
      include: {
        vendor: { select: { nameEn: true } },
        rfq: {
          select: {
            request: {
              select: {
                neededBy: true,
              },
            },
          },
        },
      },
    });

    const stats = new Map<
      string,
      {
        total: number;
        onTime: number;
      }
    >();

    orders.forEach((order) => {
      const vendorName = order.vendor?.nameEn ?? "Unassigned";
      const entry = stats.get(vendorName) ?? { total: 0, onTime: 0 };
      entry.total += 1;
      const neededBy = order.rfq.request?.neededBy;
      if (neededBy && order.updatedAt.getTime() <= neededBy.getTime()) {
        entry.onTime += 1;
      }
      stats.set(vendorName, entry);
    });

    const labels: string[] = [];
    const data: number[] = [];

    Array.from(stats.entries())
      .sort((a, b) => {
        const pctA = a[1].total === 0 ? 0 : a[1].onTime / a[1].total;
        const pctB = b[1].total === 0 ? 0 : b[1].onTime / b[1].total;
        return pctB - pctA;
      })
      .slice(0, 10)
      .forEach(([vendor, info]) => {
        labels.push(vendor);
        data.push(info.total === 0 ? 0 : Number((info.onTime / info.total) * 100));
      });

    return NextResponse.json(
      {
        labels,
        data,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/delivery/vendors-on-time", error);
    return NextResponse.json({ labels: [], data: [] }, { status: 500 });
  }
}
