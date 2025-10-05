import { NextResponse } from "next/server";
import { Prisma, Priority } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/vendors/[id]/followups", params.id, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json();
    const parsed = createFollowupSchema.parse(json);

    const status = parsed.status && STATUS_WHITELIST.has(parsed.status)
      ? parsed.status
      : "open";

    const followup = await prisma.followup.create({
      data: {
        vendorId: params.id,
        title: parsed.title,
        dueAt: new Date(parsed.dueAt),
        priority: mapPriority(parsed.priority),
        status,
        relatedType: parsed.relatedType,
        relatedId: parsed.relatedId,
        notes: parsed.notes,
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

    return NextResponse.json(followup, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid payload", issues: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    console.error("POST /api/vendors/[id]/followups", params.id, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
