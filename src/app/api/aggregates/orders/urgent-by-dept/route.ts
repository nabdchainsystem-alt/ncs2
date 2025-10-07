export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { aggregateUrgentByDepartment } from "../_utils/urgent";
import { ok, fail } from "@/server/api-helpers";

export async function GET() {
  try {
    const data = await aggregateUrgentByDepartment();
    return ok(data);
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/urgent-by-dept", error);
    return fail(500, "Server error", error?.message);
  }
}
