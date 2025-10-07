export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { ok, fail } from "@/server/api-helpers";

const CURRENCY = "SAR";

function decimalToNumber(value?: Prisma.Decimal | null) {
  return value ? Number(value.toFixed(4)) : 0;
}

type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  timestamp: Date;
  description?: string;
  meta?: Record<string, unknown>;
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const take = Math.max(1, Math.min(Number(url.searchParams.get("take") ?? "50") || 50, 200));

    const [followups, purchaseOrders, rfqs, invoices] = await Promise.all([
      prisma.followup.findMany({
        where: { vendorId: params.id },
        select: {
          id: true,
          title: true,
          dueAt: true,
          status: true,
          priority: true,
          notes: true,
          createdAt: true,
        },
      }),
      prisma.purchaseOrder.findMany({
        where: { vendorId: params.id },
        select: {
          id: true,
          poNo: true,
          status: true,
          total: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.rfq.findMany({
        where: { vendorId: params.id },
        select: {
          id: true,
          quotationNo: true,
          createdAt: true,
          totalIncVat: true,
        },
      }),
      prisma.invoice.findMany({
        where: { vendorId: params.id },
        select: {
          id: true,
          number: true,
          status: true,
          amount: true,
          paid: true,
          issueDate: true,
          updatedAt: true,
        },
      }),
    ]);

    const events: TimelineEvent[] = [];

    followups.forEach((followup) => {
      events.push({
        id: `followup:${followup.id}`,
        type: "followup",
        title: followup.title,
        timestamp: followup.createdAt,
        description: followup.notes ?? undefined,
        meta: {
          status: followup.status,
          priority: followup.priority,
          dueAt: followup.dueAt,
        },
      });
    });

    purchaseOrders.forEach((po) => {
      events.push({
        id: `po:${po.id}`,
        type: "purchase-order",
        title: `Purchase Order ${po.poNo}`,
        timestamp: po.updatedAt ?? po.createdAt,
        description: `Status: ${po.status}`,
        meta: {
          total: decimalToNumber(po.total),
          currency: CURRENCY,
        },
      });
    });

    rfqs.forEach((rfq) => {
      events.push({
        id: `rfq:${rfq.id}`,
        type: "rfq",
        title: `RFQ ${rfq.quotationNo}`,
        timestamp: rfq.createdAt,
        meta: {
          total: decimalToNumber(rfq.totalIncVat),
          currency: CURRENCY,
        },
      });
    });

    invoices.forEach((invoice) => {
      const outstanding = invoice.amount.sub(invoice.paid ?? new Prisma.Decimal(0));
      events.push({
        id: `invoice:${invoice.id}`,
        type: "invoice",
        title: `Invoice ${invoice.number}`,
        timestamp: invoice.updatedAt,
        description: `Status: ${invoice.status}`,
        meta: {
          amount: decimalToNumber(invoice.amount),
          outstanding: decimalToNumber(outstanding),
          currency: CURRENCY,
          issuedOn: invoice.issueDate,
        },
      });
    });

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return ok({ rows: events.slice(0, take) });
  } catch (error: any) {
    console.error("GET /api/vendors/[id]/activity", params.id, error);
    return fail(500, "Server error", error?.message);
  }
}
