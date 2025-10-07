export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") || "").trim();
  const takeParam = Number(url.searchParams.get("take") || DEFAULT_LIMIT);
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 100) : DEFAULT_LIMIT;

  if (!rawQuery) {
    const recent = await prisma.material.findMany({
      select: { id: true, code: true, name: true, unit: true },
      orderBy: { updatedAt: "desc" },
      take,
    });

    return NextResponse.json(recent);
  }

  const prefixMatches = await prisma.material.findMany({
    where: {
      OR: [
        { code: { startsWith: rawQuery } },
        { name: { startsWith: rawQuery } },
      ],
    },
    select: { id: true, code: true, name: true, unit: true },
    orderBy: [{ code: "asc" }],
    take,
  });

  const remainingSlots = take - prefixMatches.length;

  if (remainingSlots <= 0) {
    return NextResponse.json(prefixMatches.slice(0, take));
  }

  const prefixIds = prefixMatches.map((item) => item.id);

  const containsMatches = await prisma.material.findMany({
    where: {
      id: prefixIds.length ? { notIn: prefixIds } : undefined,
      OR: [
        { code: { contains: rawQuery } },
        { name: { contains: rawQuery } },
      ],
    },
    select: { id: true, code: true, name: true, unit: true },
    orderBy: [{ code: "asc" }],
    take: remainingSlots,
  });

  return NextResponse.json([...prefixMatches, ...containsMatches].slice(0, take));
}
