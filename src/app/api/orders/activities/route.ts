export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

function buildActivity(payload: Awaited<ReturnType<typeof prisma.purchaseOrder.findMany>>[number]) {
  const createdAt = payload.createdAt.getTime();
  const updatedAt = payload.updatedAt.getTime();
  const vendorName = payload.vendor?.nameEn ?? "";

  let action = "ORDER_UPDATED";
  let detail: string | null = null;

  if (createdAt === updatedAt) {
    action = "ORDER_CREATED";
    detail = `Purchase order created for ${vendorName}`;
  } else if (payload.status === "CANCELLED") {
    action = "ORDER_CANCELLED";
    detail = "Order was cancelled";
  } else if (payload.status === "CLOSED" || payload.status === "RECEIVED") {
    action = "ORDER_COMPLETED";
    detail = `Status updated to ${payload.status}`;
  } else {
    detail = `Status updated to ${payload.status}`;
  }

  return {
    id: payload.id,
    code: payload.poNo,
    action,
    status: payload.status,
    priority: payload.priority,
    detail,
    createdAt: updatedAt === createdAt ? payload.createdAt.toISOString() : payload.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const takeParam = url.searchParams.get("take");
    const take = takeParam ? Math.min(Math.max(Number(takeParam) || 0, 1), 50) : 20;

    const orders = await prisma.purchaseOrder.findMany({
      orderBy: { updatedAt: "desc" },
      take,
      include: {
        vendor: { select: { nameEn: true } },
      },
    });

    const activities = orders.map(buildActivity);

    return ok(activities);
  } catch (error: any) {
    console.error("GET /api/orders/activities", error);
    return fail(500, "Server error", error?.message);
  }
}
