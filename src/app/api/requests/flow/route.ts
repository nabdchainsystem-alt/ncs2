import { NextResponse } from "next/server";
import { RequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const STATUS_TO_STAGE: Record<RequestStatus, string> = {
  OPEN: "APPROVED",
  PENDING: "PENDING",
  CLOSED: "COMPLETED",
  CANCELLED: "REJECTED",
};

const OUTCOME_FOR_STAGE: Record<string, string> = {
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

function clampDays(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function startOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, amount: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + amount);
  return d;
}

async function hasStatusLogTable() {
  try {
    const rows = (await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'RequestStatusChange';
    `) as { name: string }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function computeBreachRatios(start: Date, inclusiveEnd: Date) {
  const requests = await prisma.request.findMany({
    where: {
      createdAt: {
        gte: start,
        lt: inclusiveEnd,
      },
    },
    select: {
      status: true,
      neededBy: true,
    },
  });

  const now = new Date();
  const totals = new Map<string, number>();
  const breaches = new Map<string, number>();

  for (const req of requests) {
    const stage = STATUS_TO_STAGE[req.status] ?? (req.status as string) ?? "PENDING";
    const key = `${stage}||Open`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
    if (req.neededBy && req.neededBy < now && stage !== "COMPLETED" && stage !== "REJECTED") {
      breaches.set(key, (breaches.get(key) ?? 0) + 1);
    }
  }

  const ratios = new Map<string, number>();
  for (const [key, total] of totals) {
    const breach = breaches.get(key) ?? 0;
    ratios.set(key, total ? breach / total : 0);
  }

  return ratios;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedDays = Number.parseInt(searchParams.get("days") || "30", 10);
  const days = clampDays(requestedDays, 7, 180);

  const end = startOfDay(new Date());
  const start = addDays(end, -(days - 1));
  const inclusiveEnd = addDays(end, 1);

  const links: Array<{ source: string; target: string; value: number; breach?: number }> = [];

  const useLogTable = await hasStatusLogTable();

  if (useLogTable) {
    const deptToStatus = await prisma.$queryRaw<{
      dept: string | null;
      status: string;
      cnt: bigint;
    }[]>`
      SELECT COALESCE(d.name, 'Unassigned') AS dept,
             l.status AS status,
             COUNT(*) AS cnt
      FROM RequestStatusChange l
      JOIN Request r ON r.id = l.requestId
      LEFT JOIN Department d ON d.id = r.departmentId
      WHERE l.changedAt >= ${start}
        AND l.changedAt < ${inclusiveEnd}
      GROUP BY dept, status
    `;

    for (const row of deptToStatus) {
      const stage = STATUS_TO_STAGE[row.status as RequestStatus] ?? row.status;
      links.push({
        source: row.dept ?? "Unassigned",
        target: stage,
        value: Number(row.cnt),
      });
    }

    const statusToOutcome = await prisma.$queryRaw<{
      status: string;
      outcome: string;
      cnt: bigint;
    }[]>`
      SELECT l.status AS status,
             CASE
               WHEN r.status = 'CLOSED' THEN 'Completed'
               WHEN r.status = 'CANCELLED' THEN 'Rejected'
               ELSE 'Open'
             END AS outcome,
             COUNT(*) AS cnt
      FROM RequestStatusChange l
      JOIN Request r ON r.id = l.requestId
      WHERE l.changedAt >= ${start}
        AND l.changedAt < ${inclusiveEnd}
      GROUP BY status, outcome
    `;

    for (const row of statusToOutcome) {
      const stage = STATUS_TO_STAGE[row.status as RequestStatus] ?? row.status;
      links.push({
        source: stage,
        target: row.outcome,
        value: Number(row.cnt),
      });
    }
  } else {
    const requests = await prisma.request.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: inclusiveEnd,
        },
      },
      select: {
        status: true,
        department: { select: { name: true } },
        neededBy: true,
      },
    });

    const deptStatus = new Map<string, number>();
    const statusOutcome = new Map<string, number>();

    for (const req of requests) {
      const stage = STATUS_TO_STAGE[req.status] ?? (req.status as string) ?? "PENDING";
      const department = req.department?.name ?? "Unassigned";
      const outcome = OUTCOME_FOR_STAGE[stage] ?? "Open";

      const deptKey = `${department}||${stage}`;
      deptStatus.set(deptKey, (deptStatus.get(deptKey) ?? 0) + 1);

      const statusKey = `${stage}||${outcome}`;
      statusOutcome.set(statusKey, (statusOutcome.get(statusKey) ?? 0) + 1);
    }

    for (const [k, value] of deptStatus) {
      const [dept, stage] = k.split("||");
      links.push({ source: dept, target: stage, value });
    }

    for (const [k, value] of statusOutcome) {
      const [stage, outcome] = k.split("||");
      links.push({
        source: stage,
        target: outcome,
        value,
      });
    }
  }

  const breachRatios = await computeBreachRatios(start, inclusiveEnd);
  const enriched = links.map((link) => {
    if (link.target !== "Open") return link;
    const ratio = breachRatios.get(`${link.source}||Open`);
    return ratio != null ? { ...link, breach: ratio } : link;
  });

  return NextResponse.json({ links: enriched });
}
