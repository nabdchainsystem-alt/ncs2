import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.pOItem.groupBy({
      by: ["materialId", "name"],
      _sum: {
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          lineTotal: "desc",
        },
      },
      take: 10,
    });

    const labels: string[] = [];
    const data: number[] = [];
    const requestCache = new Map<string, { materialName: string | null; itemName: string | null } | null>();

    for (const row of rows) {
      let label = row.name ?? "Unassigned";
      if (row.materialId) {
        const material = await prisma.material.findUnique({
          where: { id: row.materialId },
          select: { name: true },
        });
        if (material?.name) {
          label = material.name;
        }
      } else if (row.name) {
        let cached = requestCache.get(row.name);
        if (cached === undefined) {
          const request = await prisma.request.findUnique({
            where: { code: row.name },
            select: {
              items: {
                orderBy: { id: "asc" },
                take: 1,
                select: {
                  name: true,
                  material: { select: { name: true } },
                },
              },
            },
          });

          const item = request?.items?.[0];
          cached = item
            ? {
                materialName: item.material?.name ?? null,
                itemName: item.name ?? null,
              }
            : null;

          requestCache.set(row.name, cached);
        }

        if (cached) {
          label = cached.materialName ?? cached.itemName ?? label;
        }
      }
      labels.push(label);
      data.push(Number(row._sum.lineTotal ?? new Prisma.Decimal(0)));
    }

    return NextResponse.json(
      {
        labels,
        data,
        currency: "SAR",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/aggregates/orders/spend/materials-distribution", error);
    return NextResponse.json({ labels: [], data: [], currency: "SAR" }, { status: 500 });
  }
}
