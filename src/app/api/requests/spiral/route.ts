export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { RequestStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

const DAYS = 60;

const STATUS_TO_STAGE: Record<RequestStatus, string> = {
  OPEN: "APPROVED",
  PENDING: "PENDING",
  CLOSED: "COMPLETED",
  CANCELLED: "REJECTED",
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const end = startOfDay(new Date());
    const start = new Date(end.getTime() - (DAYS - 1) * 24 * 60 * 60 * 1000);

    const requests = await prisma.request.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    const buckets = new Map<string, { count: number; byStatus: Map<string, number> }>();
    for (let i = 0; i < DAYS; i += 1) {
      const day = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      buckets.set(key, { count: 0, byStatus: new Map() });
    }

    for (const req of requests) {
      const key = startOfDay(new Date(req.createdAt)).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.count += 1;
      const stage = STATUS_TO_STAGE[req.status] ?? (req.status as string) ?? "PENDING";
      bucket.byStatus.set(stage, (bucket.byStatus.get(stage) ?? 0) + 1);
    }

    const data = Array.from(buckets.entries()).map(([day, bucket]) => {
      const topStatus = Array.from(bucket.byStatus.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "PENDING";
      return {
        day,
        count: bucket.count,
        topStatus,
      };
    });

    return ok({ data });
  } catch (error: any) {
    return fail(500, "Server error", error?.message);
  }
}
