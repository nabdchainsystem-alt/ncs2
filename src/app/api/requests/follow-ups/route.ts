export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

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

    return ok(
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
    );
  } catch (error: any) {
    console.error("GET /api/requests/follow-ups", error);
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const dueDate = new Date(parsed.data.dueDate);

    let requestId: string | null = parsed.data.requestId || null;
    if (!requestId && parsed.data.requestCode) {
      const matched = await prisma.request.findUnique({
        where: { code: parsed.data.requestCode },
        select: { id: true },
      });
      if (matched) {
        requestId = matched.id;
      }
    }

    const created = await prisma.requestFollowUp.create({
      data: {
        title: parsed.data.title.trim(),
        notes: parsed.data.notes?.trim() || null,
        dueDate,
        priority: parsed.data.priority ?? "Normal",
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

    return ok(
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
      201
    );
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    console.error("POST /api/requests/follow-ups", error);
    return fail(500, "Server error", error?.message);
  }
}
