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

    const summary = new Map<string, { deliveries: number; onTime: number; delayTotal: number }>();

    orders.forEach((order) => {
      const vendorName = order.vendor?.nameEn ?? "Unassigned";
      const entry = summary.get(vendorName) ?? { deliveries: 0, onTime: 0, delayTotal: 0 };
      entry.deliveries += 1;

      const neededBy = order.rfq.request?.neededBy;
      if (neededBy) {
        if (order.updatedAt.getTime() <= neededBy.getTime()) {
          entry.onTime += 1;
        } else {
          const diff = order.updatedAt.getTime() - neededBy.getTime();
          entry.delayTotal += diff / (1000 * 60 * 60 * 24);
        }
      }

      summary.set(vendorName, entry);
    });

    const rows = Array.from(summary.entries()).map(([vendor, data]) => ({
      vendor,
      deliveries: data.deliveries,
      onTimePct: data.deliveries === 0 ? 0 : (data.onTime / data.deliveries) * 100,
      avgDelayDays:
        data.deliveries === data.onTime
          ? 0
          : data.delayTotal / Math.max(1, data.deliveries - data.onTime),
    }));

    return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/aggregates/orders/delivery/summary", error);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
