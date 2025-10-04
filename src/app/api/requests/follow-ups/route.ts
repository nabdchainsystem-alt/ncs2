import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(["Low", "Normal", "High", "Urgent"]).optional(),
  requestId: z.string().optional().nullable(),
  requestCode: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    const where: { dueDate?: { gte?: Date; lte?: Date } } = {};
    if (startParam || endParam) {
      where.dueDate = {};
      if (startParam) {
        const start = new Date(startParam);
        if (!Number.isNaN(start.getTime())) {
          where.dueDate.gte = start;
        }
      }
      if (endParam) {
        const end = new Date(endParam);
        if (!Number.isNaN(end.getTime())) {
          where.dueDate.lte = end;
        }
      }
    }

    const followUps = await prisma.requestFollowUp.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        request: {
          select: { id: true, code: true, priority: true },
        },
      },
    });

    return NextResponse.json(
      followUps.map((task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority,
        requestId: task.requestId,
        requestCode: task.request?.code ?? null,
        requestPriority: task.request?.priority ?? null,
      })),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/requests/follow-ups", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);

    const dueDate = new Date(parsed.dueDate);

    let requestId: string | null = parsed.requestId || null;
    if (!requestId && parsed.requestCode) {
      const matched = await prisma.request.findUnique({
        where: { code: parsed.requestCode },
        select: { id: true },
      });
      if (matched) {
        requestId = matched.id;
      }
    }

    const created = await prisma.requestFollowUp.create({
      data: {
        title: parsed.title.trim(),
        notes: parsed.notes?.trim() || null,
        dueDate,
        priority: parsed.priority ?? "Normal",
        requestId,
      },
      include: {
        request: { select: { id: true, code: true, priority: true } },
      },
    });

    if (created.requestId) {
      await prisma.requestActivity.create({
        data: {
          requestId: created.requestId,
          action: "Follow-up Scheduled",
          detail: `${created.title} due on ${created.dueDate.toISOString().slice(0, 10)}`,
        },
      });
    }

    return NextResponse.json(
      {
        id: created.id,
        title: created.title,
        notes: created.notes,
        dueDate: created.dueDate,
        status: created.status,
        priority: created.priority,
        requestId: created.requestId,
        requestCode: created.request?.code ?? null,
        requestPriority: created.request?.priority ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    console.error("POST /api/requests/follow-ups", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
