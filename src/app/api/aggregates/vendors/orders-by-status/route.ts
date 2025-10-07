export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

import { orderStatusesBuckets } from "../utils";

const LABELS = ["Open", "Closed", "Cancelled"] as const;

export async function GET() {
  try {
    const grouped = await prisma.purchaseOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const counts: Record<(typeof LABELS)[number], number> = {
      Open: 0,
      Closed: 0,
      Cancelled: 0,
    };

    grouped.forEach((entry) => {
      const bucket = orderStatusesBuckets(entry.status);
      counts[bucket] += entry._count._all;
    });

    return NextResponse.json(
      {
        labels: [...LABELS],
        data: LABELS.map((label) => counts[label]),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/vendors/orders-by-status", error);
    return NextResponse.json({ labels: [...LABELS], data: LABELS.map(() => 0) }, { status: 500 });
  }
}
