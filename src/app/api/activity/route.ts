import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildBoundaries, type Bucket } from "@/server/dateBuckets";

type Kind = "requests" | "orders";

type Series = {
  label: string;
  new: number;
  pending: number;
  approved: number;
  closed: number;
};

type Boundary = ReturnType<typeof buildBoundaries>[number];

function buildEmptySeries(bounds: Boundary[]): Series[] {
  return bounds.map((boundary) => ({
    label: boundary.label,
    new: 0,
    pending: 0,
    approved: 0,
    closed: 0,
  }));
}

const DEFAULT_SPAN: Record<Bucket, number> = {
  daily: 14,
  weekly: 12,
  monthly: 6,
};

function parseKind(value: string | null): Kind {
  return value === "orders" ? "orders" : "requests";
}

function parseBucket(value: string | null): Bucket {
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return "daily";
}

function parseSpan(value: string | null, bucket: Bucket): number {
  if (!value) {
    return DEFAULT_SPAN[bucket];
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_SPAN[bucket];
  }
  return Math.min(parsed, bucket === "daily" ? 180 : 52);
}

function countInRange(dates: Date[], from: Date, to: Date) {
  if (dates.length === 0) return 0;
  const fromTs = from.getTime();
  const toTs = to.getTime();
  let total = 0;
  for (const value of dates) {
    const ts = value.getTime();
    if (ts >= fromTs && ts < toTs) {
      total += 1;
    }
  }
  return total;
}

function includesDetail(detail: string | null | undefined, term: string) {
  if (!detail) return false;
  return detail.toLowerCase().includes(term.toLowerCase());
}

async function tableExists(tableName: string) {
  try {
    const rows = await prisma.$queryRaw<{ name: string }[]>(
      Prisma.sql`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ${tableName}
        LIMIT 1
      `
    );
    return rows.length > 0;
  } catch (error) {
    console.warn(`Failed to inspect table ${tableName}`, error);
    return false;
  }
}

async function aggregateRequests(bounds: Boundary[]): Promise<Series[]> {
  if (bounds.length === 0) return [];
  const earliest = bounds[0]?.from ?? new Date();

  let requests: Array<{
    createdAt: Date;
    updatedAt: Date;
    status: string;
    approvalStatus: string | null;
  }> = [];
  try {
    requests = await prisma.request.findMany({
      where: {
        OR: [
          { createdAt: { gte: earliest } },
          { updatedAt: { gte: earliest } },
        ],
      },
      select: {
        createdAt: true,
        updatedAt: true,
        status: true,
        approvalStatus: true,
      },
    });
  } catch (error) {
    console.error("aggregateRequests request snapshot failed", error);
    return buildEmptySeries(bounds);
  }

  const newDates = requests
    .filter((row) => row.createdAt >= earliest)
    .map((row) => row.createdAt);

  let activities: Array<{ action: string; detail: string | null; createdAt: Date }> = [];
  const hasActivityLog = await tableExists("RequestActivity");
  if (hasActivityLog) {
    try {
      activities = await prisma.requestActivity.findMany({
        where: {
          createdAt: { gte: earliest },
          action: {
            in: ["Request Created", "Status Updated", "Approval Updated"],
          },
        },
        select: {
          action: true,
          detail: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.warn("aggregateRequests activity log unavailable", error);
      activities = [];
    }
  }

  const pendingDates: Date[] = [];
  const approvedDates: Date[] = [];
  const closedDates: Date[] = [];

  if (activities.length > 0) {
    for (const activity of activities) {
      const when = activity.createdAt;
      if (activity.action === "Status Updated") {
        if (includesDetail(activity.detail, "PENDING") || includesDetail(activity.detail, "OPEN")) {
          pendingDates.push(when);
        }
        if (includesDetail(activity.detail, "CLOSED") || includesDetail(activity.detail, "COMPLETED")) {
          closedDates.push(when);
        }
      } else if (activity.action === "Approval Updated") {
        if (includesDetail(activity.detail, "approved")) {
          approvedDates.push(when);
        }
      }
    }
  }

  if (pendingDates.length === 0) {
    for (const row of requests) {
      if (row.updatedAt >= earliest && (row.status === "PENDING" || row.status === "OPEN")) {
        pendingDates.push(row.updatedAt);
      }
    }
  }

  if (approvedDates.length === 0) {
    for (const row of requests) {
      if (row.updatedAt >= earliest && row.approvalStatus === "APPROVED") {
        approvedDates.push(row.updatedAt);
      }
    }
  }

  if (closedDates.length === 0) {
    for (const row of requests) {
      if (row.updatedAt >= earliest && (row.status === "CLOSED" || row.status === "COMPLETED")) {
        closedDates.push(row.updatedAt);
      }
    }
  }

  return bounds.map((boundary) => ({
    label: boundary.label,
    new: countInRange(newDates, boundary.from, boundary.to),
    pending: countInRange(pendingDates, boundary.from, boundary.to),
    approved: countInRange(approvedDates, boundary.from, boundary.to),
    closed: countInRange(closedDates, boundary.from, boundary.to),
  }));
}

async function aggregateOrders(bounds: Boundary[]): Promise<Series[]> {
  if (bounds.length === 0) return [];
  const earliest = bounds[0]?.from ?? new Date();

  let orders: Array<{ createdAt: Date; updatedAt: Date; status: string }> = [];
  try {
    orders = await prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { createdAt: { gte: earliest } },
          { updatedAt: { gte: earliest } },
        ],
      },
      select: {
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    });
  } catch (error) {
    console.error("aggregateOrders snapshot failed", error);
    return buildEmptySeries(bounds);
  }

  const newDates = orders
    .filter((row) => row.createdAt >= earliest)
    .map((row) => row.createdAt);

  const pendingDates: Date[] = [];
  const approvedDates: Date[] = [];
  const closedDates: Date[] = [];

  const hasOrderLog = await tableExists("PurchaseOrderStatusChange");
  if (hasOrderLog) {
    try {
      const statusRows = await prisma.$queryRaw<{ status: string; changedAt: Date }[]>(
        Prisma.sql`
          SELECT status, changedAt
          FROM "PurchaseOrderStatusChange"
          WHERE changedAt >= ${earliest}
        `
      );
      for (const row of statusRows) {
        const status = row.status.toUpperCase();
        if (status === "PENDING" || status === "OPEN" || status === "PARTIAL") {
          pendingDates.push(row.changedAt);
        } else if (status === "APPROVED" || status === "RECEIVED") {
          approvedDates.push(row.changedAt);
        } else if (status === "CLOSED" || status === "COMPLETED") {
          closedDates.push(row.changedAt);
        }
      }
    } catch (error) {
      console.warn("Unable to read PurchaseOrderStatusChange", error);
    }
  }

  if (pendingDates.length === 0) {
    for (const order of orders) {
      if (order.updatedAt >= earliest && (order.status === "OPEN" || order.status === "PARTIAL")) {
        pendingDates.push(order.updatedAt);
      }
    }
  }

  if (approvedDates.length === 0) {
    for (const order of orders) {
      if (order.updatedAt >= earliest && (order.status === "RECEIVED" || order.status === "APPROVED")) {
        approvedDates.push(order.updatedAt);
      }
    }
  }

  if (closedDates.length === 0) {
    for (const order of orders) {
      if (order.updatedAt >= earliest && (order.status === "CLOSED" || order.status === "COMPLETED")) {
        closedDates.push(order.updatedAt);
      }
    }
  }

  return bounds.map((boundary) => ({
    label: boundary.label,
    new: countInRange(newDates, boundary.from, boundary.to),
    pending: countInRange(pendingDates, boundary.from, boundary.to),
    approved: countInRange(approvedDates, boundary.from, boundary.to),
    closed: countInRange(closedDates, boundary.from, boundary.to),
  }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = parseKind(url.searchParams.get("kind"));
    const bucket = parseBucket(url.searchParams.get("bucket"));
    const span = parseSpan(url.searchParams.get("span"), bucket);

    const bounds = buildBoundaries(bucket, span);
    const data = kind === "orders" ? await aggregateOrders(bounds) : await aggregateRequests(bounds);

    return NextResponse.json(
      {
        kind,
        bucket,
        span,
        data,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/activity", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
