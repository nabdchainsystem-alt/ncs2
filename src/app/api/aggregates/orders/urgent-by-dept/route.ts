import { NextResponse } from "next/server";

import { aggregateUrgentByDepartment } from "../_utils/urgent";

export async function GET() {
  try {
    const data = await aggregateUrgentByDepartment();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/aggregates/orders/urgent-by-dept", error);
    return NextResponse.json({ labels: [], data: [] }, { status: 500 });
  }
}
