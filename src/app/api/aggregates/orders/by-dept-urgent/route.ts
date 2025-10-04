import { NextResponse } from "next/server";

import { aggregateUrgentByDepartment } from "../_utils/urgent";

export async function GET() {
  try {
    const { labels, data } = await aggregateUrgentByDepartment();

    return NextResponse.json(
      {
        labels,
        data,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/by-dept-urgent", error);
    return NextResponse.json({ labels: [], data: [] }, { status: 500 });
  }
}
