export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { computeUrgentStatusSeries } from "../_utils/urgent";
import { ok, fail } from "@/server/api-helpers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const period =
      periodParam === "daily" || periodParam === "weekly" || periodParam === "monthly"
        ? periodParam
        : "monthly";
    const payload = await computeUrgentStatusSeries(period);
    return ok(payload);
  } catch (error: any) {
    console.error("GET /api/aggregates/orders/urgent-status", error);
    return fail(500, "Server error", error?.message);
  }
}
