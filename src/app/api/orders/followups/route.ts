export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Priority } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(["open", "all", "closed"]).default("open"),
});

const createSchema = z.object({
  title: z.string().min(1),
  dueDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid due date"),
  priority: z.nativeEnum(Priority),
  orderCode: z.string().optional(),
  notes: z.string().optional(),
});

function parseDate(dateString: string | undefined, fallback: Date) {
  if (!dateString) return fallback;
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const queryResult = querySchema.safeParse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!queryResult.success) {
      return fail(400, "Validation error", queryResult.error.flatten().fieldErrors);
    }

    const params = queryResult.data;

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const fromDate = parseDate(params.from, defaultStart);
    const toDate = parseDate(params.to, defaultEnd);

    const followUps = await prisma.purchaseOrderFollowUp.findMany({
      where: {
        dueDate: {
          gte: fromDate,
          lte: toDate,
        },
        ...(params.status === "open"
          ? { status: { in: ["Pending", "In Progress"] } }
          : params.status === "closed"
          ? { status: { in: ["Completed"] } }
          : {}),
      },
      include: {
        purchaseOrder: { select: { poNo: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const response = followUps.map((item) => ({
      id: item.id,
      title: item.title,
      dueDate: item.dueDate.toISOString(),
      priority: item.priority,
      orderCode: item.purchaseOrder?.poNo ?? null,
      notes: item.notes ?? null,
      status: item.status,
    }));

    return ok(response);
  } catch (error: any) {
    console.error("GET /api/orders/followups", error);
    return fail(500, "Server error", error?.message);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readJson(request);
    const parsed = createSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    let purchaseOrderId: string | null = null;

    if (data.orderCode) {
      const order = await prisma.purchaseOrder.findUnique({
        where: { poNo: data.orderCode },
        select: { id: true },
      });
      if (!order) {
        return fail(404, "Purchase order not found");
      }
      purchaseOrderId = order.id;
    }

    const created = await prisma.purchaseOrderFollowUp.create({
      data: {
        title: data.title,
        dueDate: new Date(data.dueDate),
        priority: data.priority,
        notes: data.notes ?? null,
        purchaseOrderId,
      },
      include: {
        purchaseOrder: { select: { poNo: true } },
      },
    });

    return ok(
      {
        id: created.id,
        title: created.title,
        dueDate: created.dueDate.toISOString(),
        priority: created.priority,
        orderCode: created.purchaseOrder?.poNo ?? null,
        notes: created.notes ?? null,
        status: created.status,
      },
      201
    );
  } catch (error: any) {
    console.error("POST /api/orders/followups", error);
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof z.ZodError) {
      return fail(400, "Validation error", error.flatten().fieldErrors);
    }
    return fail(500, "Server error", error?.message);
  }
}
