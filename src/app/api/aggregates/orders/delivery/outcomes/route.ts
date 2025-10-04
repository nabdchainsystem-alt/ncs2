import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["RECEIVED", "CLOSED"] },
      },
      select: {
        updatedAt: true,
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

    let onTime = 0;
    let delayed = 0;

    orders.forEach((order) => {
      const neededBy = order.rfq?.request?.neededBy;
      if (!neededBy) return;
      if (order.updatedAt.getTime() <= neededBy.getTime()) {
        onTime += 1;
      } else {
        delayed += 1;
      }
    });

    return NextResponse.json(
      {
        labels: ["On-Time", "Delayed"],
        data: [onTime, delayed],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/delivery/outcomes", error);
    return NextResponse.json({ labels: ["On-Time", "Delayed"], data: [0, 0] }, { status: 500 });
  }
}
