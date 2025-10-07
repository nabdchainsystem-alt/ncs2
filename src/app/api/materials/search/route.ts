export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";
import { ok, fail } from "@/server/api-helpers";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  try {
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

      return ok(recent);
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
      return ok(prefixMatches.slice(0, take));
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

    return ok([...prefixMatches, ...containsMatches].slice(0, take));
  } catch (error: any) {
    return fail(500, "Server error", error?.message);
  }
}
