export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma, Priority } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { ok, fail, readJson } from "@/server/api-helpers";

const sortSchema = z
  .string()
  .regex(/^[a-zA-Z]+:(asc|desc)$/)
  .default("createdAt:desc");

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().transform((value) => value?.trim() || undefined),
  status: z
    .enum(["OPEN", "PARTIAL", "RECEIVED", "CLOSED", "CANCELLED"], {
      invalid_type_error: "Invalid status",
    })
    .optional(),
  vendor: z.string().optional().transform((value) => value?.trim() || undefined),
  sort: sortSchema.optional(),
});

const allowedSortFields = new Set(["createdAt", "poNo", "total"]);

function parseSort(sort?: string) {
  const fallback = { field: "createdAt", direction: "desc" as const };
  if (!sort) return fallback;
  const [field, direction] = sort.split(":");
  if (!field || (direction !== "asc" && direction !== "desc")) return fallback;
  if (!allowedSortFields.has(field)) return fallback;
  return { field, direction: direction as "asc" | "desc" };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") || undefined,
      vendor: url.searchParams.get("vendor") || undefined,
      sort: url.searchParams.get("sort") || undefined,
    });
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const { page, pageSize, search, status, vendor, sort } = parsed.data;
    const { field, direction } = parseSort(sort);

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status ? { status } : {}),
      ...(vendor ? { vendorId: vendor } : {}),
      ...(search
        ? {
            OR: [
              { poNo: { contains: search, mode: "insensitive" } },
              { rfq: { quotationNo: { contains: search, mode: "insensitive" } } },
              { vendor: { nameEn: { contains: search, mode: "insensitive" } } },
              { items: { some: { name: { contains: search, mode: "insensitive" } } } },
              {
                items: {
                  some: {
                    material: { code: { contains: search, mode: "insensitive" } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: { select: { nameEn: true } },
          rfq: {
            select: {
              quotationNo: true,
              request: {
                select: {
                  department: {
                    select: {
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          items: {
            select: {
              name: true,
              material: { select: { code: true } },
            },
            orderBy: { id: "asc" },
            take: 1,
          },
        },
        orderBy: field === "total"
          ? { total: direction }
          : field === "poNo"
          ? { poNo: direction }
          : { createdAt: direction },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const rowsDto = rows.map((po) => {
      const primaryItem = po.items[0] ?? null;
      return {
        id: po.id,
        poNo: po.poNo,
        quotationNo: po.rfq.quotationNo,
        vendorName: po.vendor.nameEn,
        subtotal: po.subtotal.toFixed(2),
        vatPct: po.vatPct.toFixed(2),
        vatAmount: po.vatAmount.toFixed(2),
        total: po.total.toFixed(2),
        currency: po.currency,
        status: po.status,
        approvalStatus: po.approvalStatus,
        priority: po.priority,
        createdAt: po.createdAt.toISOString(),
        primaryItemCode: primaryItem?.material?.code ?? null,
        primaryItemName: primaryItem?.name ?? null,
        departmentName: po.rfq.request?.department?.name ?? null,
        departmentCode: po.rfq.request?.department?.code ?? null,
      };
    });

    return ok({
      rows: rowsDto,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("GET /api/purchase-orders", error);
    return fail(500, "Server error", error?.message);
  }
}

const unitEnum = ["PC", "KG", "L", "Carton", "Pallet"] as const;

const createSchema = z.object({
  rfqId: z.string().min(1, "rfqId is required"),
  vendorId: z.string().min(1, "vendorId is required"),
  currency: z.string().min(1).default("SAR"),
  vatPct: z.number().nonnegative().default(15),
  note: z.string().nullable().optional(),
  items: z
    .array(
      z
        .object({
          materialId: z.string().min(1).nullable().optional(),
          name: z.string().min(1).nullable().optional(),
          qty: z.number().positive(),
          unit: z.enum(unitEnum),
          unitPrice: z.number().nonnegative(),
          note: z.string().nullable().optional(),
        })
        .superRefine((item, ctx) => {
          if (!item.materialId && !item.name) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Name is required when material is not selected",
            });
          }
        })
    )
    .min(1, "At least one item is required"),
});

function formatPoNumber(seq: number) {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const prefix = `PO-${now.getFullYear()}${quarter}`;
  return `${prefix}${seq.toString().padStart(4, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten());
    }
    const data = parsed.data;

    const [rfq, vendor] = await Promise.all([
      prisma.rFQ.findUnique({
        where: { id: data.rfqId },
        include: {
          request: { select: { priority: true } },
        },
      }),
      prisma.vendor.findUnique({ where: { id: data.vendorId } }),
    ]);

    if (!rfq) {
      return fail(404, "RFQ not found");
    }

    if (!vendor) {
      return fail(404, "Vendor not found");
    }

    if (rfq.vendorId !== data.vendorId) {
      return fail(400, "RFQ belongs to a different vendor");
    }

    const vatPctDecimal = new Prisma.Decimal(data.vatPct);

    const created = await prisma.$transaction(async (tx) => {
      const sequence = await tx.sequence.upsert({
        where: { kind: "PO" },
        create: { kind: "PO", lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });

      const itemsData = data.items.map((item) => {
        const qty = new Prisma.Decimal(item.qty);
        const unitPrice = new Prisma.Decimal(item.unitPrice);
        const lineTotal = qty.mul(unitPrice);
        return {
          materialId: item.materialId ?? null,
          name: item.name ?? "",
          qty,
          unitPrice,
          lineTotal,
          unit: item.unit,
          note: item.note ?? null,
        };
      });

      const subtotal = itemsData
        .reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0));
      const vatAmount = subtotal.mul(vatPctDecimal).div(100);
      const total = subtotal.add(vatAmount);

      let poNo = formatPoNumber(sequence.lastValue);

      const createPayload = {
        data: {
          poNo,
          rfqId: data.rfqId,
          vendorId: data.vendorId,
          currency: data.currency,
          subtotal,
          vatPct: vatPctDecimal,
          vatAmount,
          total,
          priority: rfq.request?.priority ?? Priority.Normal,
          note: data.note ?? null,
          items: {
            createMany: {
              data: itemsData,
            },
          },
        },
        select: { id: true, poNo: true },
      } satisfies Prisma.PurchaseOrderCreateArgs;

      try {
        return await tx.purchaseOrder.create(createPayload);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          poNo = `PO-${Date.now()}`;
          return tx.purchaseOrder.create({
            ...createPayload,
            data: { ...createPayload.data, poNo },
          });
        }
        throw error;
      }
    });

    return ok(created, 201);
  } catch (error: any) {
    console.error("POST /api/purchase-orders", error);
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return fail(400, "Related record not found. Confirm the RFQ and vendor are valid.");
      }
    }
    return fail(500, "Server error", error?.message);
  }
}
