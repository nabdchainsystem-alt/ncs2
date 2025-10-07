export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { z } from "zod";

import { prisma } from "@/server/db";
import { buildBoundaries, type Bucket } from "@/server/dateBuckets";
import { ok, fail } from "@/server/api-helpers";

const SIGNAL_ORDER = ["New", "Pending", "Approved", "Closed"] as const;

type Entity = "requests" | "orders";
type Signal = (typeof SIGNAL_ORDER)[number];
type SignalSource = "activity" | "fallback";

type SignalAggregation = {
  dates: Date[];
  source: SignalSource;
};

type SeriesPoint = {
  name: Signal;
  data: number[];
};

type AuroraActivityResponse = {
  entity: Entity;
  bucket: Bucket;
  span: number;
  labels: string[];
  series: SeriesPoint[];
  meta: Record<Signal, { source: SignalSource; total: number }>;
};

const querySchema = z.object({
  entity: z.enum(["requests", "orders"]).default("requests"),
  bucket: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  span: z.coerce.number().int().min(1).max(180).optional(),
});

const DEFAULT_SPAN: Record<Bucket, number> = {
  daily: 14,
  weekly: 12,
  monthly: 12,
};

function groupDatesIntoBuckets(boundaries: ReturnType<typeof buildBoundaries>, dates: Date[]) {
  const counts = boundaries.map(() => 0);
  for (const value of dates) {
    const ts = value.getTime();
    for (let index = 0; index < boundaries.length; index += 1) {
      const bucket = boundaries[index];
      if (ts >= bucket.from.getTime() && ts < bucket.to.getTime()) {
        counts[index] += 1;
        break;
      }
    }
  }
  return counts;
}

async function buildRequestsAggregation(boundaries: ReturnType<typeof buildBoundaries>) {
  const earliestBoundary = boundaries[0]?.from ?? new Date();
  const results: Record<Signal, SignalAggregation> = {
    New: { dates: [], source: "activity" },
    Pending: { dates: [], source: "activity" },
    Approved: { dates: [], source: "activity" },
    Closed: { dates: [], source: "activity" },
  };

  const activities = await prisma.requestActivity.findMany({
    where: {
      createdAt: { gte: earliestBoundary },
      action: {
        in: ["Request Created", "Status Updated", "Approval Updated"],
      },
    },
    select: {
      action: true,
      detail: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const detailMatches = (detail: string | null | undefined, term: string) => {
    if (!detail) return false;
    return detail.toLowerCase().includes(term.toLowerCase());
  };

  results.New.dates = activities
    .filter((activity) => activity.action === "Request Created")
    .map((activity) => new Date(activity.createdAt));

  results.Pending.dates = activities
    .filter(
      (activity) => activity.action === "Status Updated" && detailMatches(activity.detail, "PENDING")
    )
    .map((activity) => new Date(activity.createdAt));

  results.Approved.dates = activities
    .filter(
      (activity) => activity.action === "Approval Updated" && detailMatches(activity.detail, "approved")
    )
    .map((activity) => new Date(activity.createdAt));

  results.Closed.dates = activities
    .filter(
      (activity) => activity.action === "Status Updated" && detailMatches(activity.detail, "CLOSED")
    )
    .map((activity) => new Date(activity.createdAt));

  const fallbackTasks: Array<Promise<void>> = [];

  if (results.New.dates.length === 0) {
    fallbackTasks.push(
      prisma.request
        .findMany({
          where: { createdAt: { gte: earliestBoundary } },
          select: { createdAt: true },
        })
        .then((rows) => {
          results.New = {
            dates: rows.map((row) => new Date(row.createdAt)),
            source: "fallback",
          };
        })
    );
  }

  if (results.Pending.dates.length === 0) {
    fallbackTasks.push(
      prisma.request
        .findMany({
          where: {
            status: "PENDING",
            updatedAt: { gte: earliestBoundary },
          },
          select: { updatedAt: true },
        })
        .then((rows) => {
          results.Pending = {
            dates: rows.map((row) => new Date(row.updatedAt)),
            source: "fallback",
          };
        })
    );
  }

  if (results.Approved.dates.length === 0) {
    fallbackTasks.push(
      prisma.request
        .findMany({
          where: {
            approvalStatus: "APPROVED",
            updatedAt: { gte: earliestBoundary },
          },
          select: { updatedAt: true },
        })
        .then((rows) => {
          results.Approved = {
            dates: rows.map((row) => new Date(row.updatedAt)),
            source: "fallback",
          };
        })
    );
  }

  if (results.Closed.dates.length === 0) {
    fallbackTasks.push(
      prisma.request
        .findMany({
          where: {
            status: "CLOSED",
            updatedAt: { gte: earliestBoundary },
          },
          select: { updatedAt: true },
        })
        .then((rows) => {
          results.Closed = {
            dates: rows.map((row) => new Date(row.updatedAt)),
            source: "fallback",
          };
        })
    );
  }

  if (fallbackTasks.length > 0) {
    await Promise.all(fallbackTasks);
  }

  return results;
}

async function buildOrdersAggregation(boundaries: ReturnType<typeof buildBoundaries>) {
  const earliestBoundary = boundaries[0]?.from ?? new Date();
  const results: Record<Signal, SignalAggregation> = {
    New: { dates: [], source: "fallback" },
    Pending: { dates: [], source: "fallback" },
    Approved: { dates: [], source: "fallback" },
    Closed: { dates: [], source: "fallback" },
  };

  const [newRows, pendingRows, approvedRows, closedRows] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: earliestBoundary } },
      select: { createdAt: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["OPEN", "PARTIAL"] },
        updatedAt: { gte: earliestBoundary },
      },
      select: { updatedAt: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: "RECEIVED",
        updatedAt: { gte: earliestBoundary },
      },
      select: { updatedAt: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: "CLOSED",
        updatedAt: { gte: earliestBoundary },
      },
      select: { updatedAt: true },
    }),
  ]);

  results.New.dates = newRows.map((row) => new Date(row.createdAt));
  results.Pending.dates = pendingRows.map((row) => new Date(row.updatedAt));
  results.Approved.dates = approvedRows.map((row) => new Date(row.updatedAt));
  results.Closed.dates = closedRows.map((row) => new Date(row.updatedAt));

  return results;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedResult = querySchema.safeParse({
      entity: url.searchParams.get("entity") ?? undefined,
      bucket: url.searchParams.get("bucket") ?? undefined,
      span: url.searchParams.get("span") ?? undefined,
    });
    if (!parsedResult.success) {
      return fail(400, "Validation error", parsedResult.error.flatten().fieldErrors);
    }
    const parsed = parsedResult.data;

    const bucket = parsed.bucket as Bucket;
    const span = parsed.span ?? DEFAULT_SPAN[bucket];

    const boundaries = buildBoundaries(bucket, span);

    if (boundaries.length === 0) {
      const emptySeries: SeriesPoint[] = SIGNAL_ORDER.map((name) => ({ name, data: [] }));
      const emptyMeta = SIGNAL_ORDER.reduce(
        (acc, signal) => {
          acc[signal] = { source: "fallback" as SignalSource, total: 0 };
          return acc;
        },
        {} as Record<Signal, { source: SignalSource; total: number }>
      );

      const payload: AuroraActivityResponse = {
        entity: parsed.entity,
        bucket,
        span,
        labels: [],
        series: emptySeries,
        meta: emptyMeta,
      };

      return ok(payload);
    }

    const aggregation =
      parsed.entity === "requests"
        ? await buildRequestsAggregation(boundaries)
        : await buildOrdersAggregation(boundaries);

    const series: SeriesPoint[] = SIGNAL_ORDER.map((name) => ({
      name,
      data: groupDatesIntoBuckets(boundaries, aggregation[name].dates),
    }));

    const meta = SIGNAL_ORDER.reduce((acc, signal) => {
      acc[signal] = {
        source: aggregation[signal].source,
        total: aggregation[signal].dates.length,
      };
      return acc;
    }, {} as Record<Signal, { source: SignalSource; total: number }>);

    const payload: AuroraActivityResponse = {
      entity: parsed.entity,
      bucket,
      span,
      labels: boundaries.map((boundary) => boundary.label),
      series,
      meta,
    };

    return ok(payload);
  } catch (error: any) {
    console.error("GET /api/aurora-activity", error);
    return fail(500, "Server error", error?.message);
  }
}
