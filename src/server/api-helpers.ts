import { NextResponse } from "next/server";

export const apiRuntime = {
  runtime: "nodejs" as const,
  dynamic: "force-dynamic" as const,
  revalidate: 0 as const,
};

/** Uniform JSON success */
export function ok(data: any, init: number = 200) {
  return NextResponse.json(data, { status: init });
}

/** Uniform JSON error with details (safe for client) */
export function fail(status: number, message: string, detail?: any) {
  return NextResponse.json({ message, detail }, { status });
}

/** Ensure request has JSON body; returns parsed JSON or throws */
export async function readJson<T = any>(req: Request): Promise<T> {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }
  return await req.json();
}
