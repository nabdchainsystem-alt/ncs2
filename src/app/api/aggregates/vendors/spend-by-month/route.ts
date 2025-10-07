export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";

import { CURRENCY, decimalToNumber, formatMonthLabel } from "../utils";
import { ok, fail } from "@/server/api-helpers";

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthSequence(months: number) {
  const today = new Date();
  const sequence: Date[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    sequence.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
  }

  return sequence;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const months = Math.max(1, Math.min(Number(url.searchParams.get("months") ?? "12") || 12, 24));

    const monthRefs = buildMonthSequence(months);
    const start = monthRefs.length ? monthRefs[0] : monthStart(new Date());

    const orders = await prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, total: true },
    });

    const buckets = monthRefs.map((monthDate) => ({
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: formatMonthLabel(monthDate),
      orders: 0,
      spend: 0,
    }));

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket] as const));

    orders.forEach((order) => {
      const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.orders += 1;
        bucket.spend += decimalToNumber(order.total);
      }
    });

    return ok({
      labels: buckets.map((bucket) => bucket.label),
      series: [
        { name: "Orders", data: buckets.map((bucket) => bucket.orders) },
        { name: `Spend (${CURRENCY})`, data: buckets.map((bucket) => Number(bucket.spend.toFixed(2))) },
      ],
    });
  } catch (error: any) {
    console.error("GET /api/aggregates/vendors/spend-by-month", error);
    return fail(500, "Server error", error?.message);
  }
}
