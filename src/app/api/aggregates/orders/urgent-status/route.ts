import { NextResponse } from "next/server";

import { computeUrgentStatusSeries } from "../_utils/urgent";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const period =
      periodParam === "daily" || periodParam === "weekly" || periodParam === "monthly"
        ? periodParam
        : "monthly";
    const payload = await computeUrgentStatusSeries(period);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/aggregates/orders/urgent-status", error);
    return NextResponse.json(
      {
        labels: [],
        series: [
          { name: "Total", data: [] },
          { name: "Over SLA", data: [] },
          { name: "Within SLA", data: [] },
          { name: "Completed", data: [] },
          { name: "Pending", data: [] },
        ],
      },
      { status: 500 }
    );
  }
}
