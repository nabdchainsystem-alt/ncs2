export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { aggregateUrgentByDepartment } from "../_utils/urgent";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const { labels, data } = await aggregateUrgentByDepartment();

    return ok({ labels, data });
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/by-dept-urgent", error);
    return fail(500, "Server error", error?.message);
  }
}
