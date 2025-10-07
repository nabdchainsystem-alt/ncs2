export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma, Priority } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const STATUS_WHITELIST = new Set(["open", "in-progress", "completed", "overdue"]);

const createFollowupSchema = z.object({
  title: z.string().min(1),
  dueAt: z.string().datetime(),
  priority: z.enum(["Low", "Normal", "High", "Urgent"]).default("Normal"),
  status: z.string().optional(),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
  notes: z.string().optional(),
});

type FollowupPayload = z.infer<typeof createFollowupSchema>;

function mapPriority(priority: FollowupPayload["priority"]): Priority {
  switch (priority) {
    case "Low":
      return Priority.Low;
    case "High":
      return Priority.High;
    case "Urgent":
      return Priority.Urgent;
    default:
      return Priority.Normal;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const statusParam = url.searchParams.get("status") || "open";

    const whereAnd: Prisma.FollowupWhereInput[] = [{ vendorId: params.id }];

    if (fromParam) {
      const fromDate = new Date(fromParam);
      if (!Number.isNaN(fromDate.getTime())) {
        whereAnd.push({ dueAt: { gte: fromDate } });
      }
    }

    if (toParam) {
      const toDate = new Date(toParam);
      if (!Number.isNaN(toDate.getTime())) {
        whereAnd.push({ dueAt: { lte: toDate } });
      }
    }

    if (statusParam && STATUS_WHITELIST.has(statusParam)) {
      whereAnd.push({ status: statusParam });
    }

    const rows = await prisma.followup.findMany({
      where: { AND: whereAnd },
      orderBy: { dueAt: "asc" },
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        status: true,
        relatedType: true,
        relatedId: true,
        notes: true,
        createdAt: true,
      },
    });

    return ok({ rows });
  } catch (error: any) {
    console.error("GET /api/vendors/[id]/followups", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const json = await readJson(request);
    const parsed = createFollowupSchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const status = parsed.data.status && STATUS_WHITELIST.has(parsed.data.status)
      ? parsed.data.status
      : "open";

    const followup = await prisma.followup.create({
      data: {
        vendorId: params.id,
        title: parsed.data.title,
        dueAt: new Date(parsed.data.dueAt),
        priority: mapPriority(parsed.data.priority),
        status,
        relatedType: parsed.data.relatedType,
        relatedId: parsed.data.relatedId,
        notes: parsed.data.notes,
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        status: true,
        relatedType: true,
        relatedId: true,
        notes: true,
        createdAt: true,
      },
    });

    return ok(followup, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    console.error("POST /api/vendors/[id]/followups", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}
