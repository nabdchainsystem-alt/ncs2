import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CURRENCY = "SAR";
const MS_IN_DAY = 1000 * 60 * 60 * 24;

type AgingBuckets = {
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
};

function toNumber(value: Prisma.Decimal | null | undefined) {
  return value ? Number(value.toFixed(4)) : 0;
}

function calculateOutstanding(amount: Prisma.Decimal, paid: Prisma.Decimal | null): Prisma.Decimal {
  const paidValue = paid ?? new Prisma.Decimal(0);
  return amount.sub(paidValue);
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const includeAging = url.searchParams.get("aging") === "1";

    const [latestInvoices, allInvoicesForAging] = await Promise.all([
      prisma.invoice.findMany({
        where: { vendorId: params.id },
        orderBy: { dueDate: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          issueDate: true,
          dueDate: true,
          amount: true,
          paid: true,
          status: true,
          poId: true,
        },
      }),
      includeAging
        ? prisma.invoice.findMany({
            where: { vendorId: params.id },
            select: { amount: true, paid: true, dueDate: true },
          })
        : Promise.resolve([]),
    ]);

    const list = latestInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      amount: toNumber(invoice.amount),
      paid: toNumber(invoice.paid),
      status: invoice.status,
      poId: invoice.poId,
      outstanding: toNumber(calculateOutstanding(invoice.amount, invoice.paid)),
    }));

    let buckets: AgingBuckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };

    if (includeAging) {
      const totals: Record<keyof AgingBuckets, Prisma.Decimal> = {
        "0-30": new Prisma.Decimal(0),
        "31-60": new Prisma.Decimal(0),
        "61-90": new Prisma.Decimal(0),
        "90+": new Prisma.Decimal(0),
      };
      const now = new Date();

      allInvoicesForAging.forEach((invoice) => {
        const outstanding = calculateOutstanding(invoice.amount, invoice.paid);
        if (outstanding.lte(0)) {
          return;
        }

        const dueDiff = Math.ceil((now.getTime() - invoice.dueDate.getTime()) / MS_IN_DAY);
        const overdueDays = Math.max(dueDiff, 0);

        if (overdueDays <= 30) {
          totals["0-30"] = totals["0-30"].add(outstanding);
        } else if (overdueDays <= 60) {
          totals["31-60"] = totals["31-60"].add(outstanding);
        } else if (overdueDays <= 90) {
          totals["61-90"] = totals["61-90"].add(outstanding);
        } else {
          totals["90+"] = totals["90+"].add(outstanding);
        }
      });

      buckets = {
        "0-30": toNumber(totals["0-30"]),
        "31-60": toNumber(totals["31-60"]),
        "61-90": toNumber(totals["61-90"]),
        "90+": toNumber(totals["90+"]),
      };
    }

    return NextResponse.json(
      {
        buckets,
        list,
        currency: CURRENCY,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/vendors/[id]/invoices", params.id, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
