import { NextResponse } from "next/server";
import { Prisma, RequestStatus, Priority } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";

type RequestRowRecord = Prisma.RequestGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
    warehouse: { select: { id: true; name: true } };
    machine: { select: { id: true; name: true } };
    vendor: { select: { id: true; nameEn: true } };
    _count: { select: { items: true } };
  };
}>;

type RequestRow = Omit<RequestRowRecord, "_count"> & { itemsCount: number };

const SORTABLE_FIELDS = new Set<keyof Prisma.RequestOrderByWithRelationInput>([
  "code",
  "createdAt",
  "updatedAt",
  "priority",
  "status",
]);

const PRIORITY_VALUES = new Set(Object.values(Priority));
const STATUS_VALUES = new Set(Object.values(RequestStatus));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, pageSize, search, sortField, sortDirection } = parsePaginationParams(url);
  const skip = (page - 1) * pageSize;

  const statusParam = url.searchParams.get("status") || undefined;
  const priorityParam = url.searchParams.get("priority") || undefined;
  const departmentId = url.searchParams.get("dept") || undefined;
  const warehouseId = url.searchParams.get("wh") || undefined;
  const machineId = url.searchParams.get("machine") || undefined;
  const vendorId = url.searchParams.get("vendor") || undefined;

  const whereAnd: Prisma.RequestWhereInput[] = [];

  if (search) {
    whereAnd.push({
      OR: [
        { code: { contains: search } },
        { description: { contains: search } },
      ],
    });
  }

  if (statusParam && STATUS_VALUES.has(statusParam as RequestStatus)) {
    whereAnd.push({ status: statusParam as RequestStatus });
  }

  if (priorityParam && PRIORITY_VALUES.has(priorityParam as Priority)) {
    whereAnd.push({ priority: priorityParam as Priority });
  }

  if (departmentId) {
    whereAnd.push({ departmentId });
  }

  if (warehouseId) {
    whereAnd.push({ warehouseId });
  }

  if (machineId) {
    whereAnd.push({ machineId });
  }

  if (vendorId) {
    whereAnd.push({ vendorId });
  }

  const where: Prisma.RequestWhereInput | undefined = whereAnd.length
    ? { AND: whereAnd }
    : undefined;

  const sortableField = sortField && SORTABLE_FIELDS.has(sortField as keyof Prisma.RequestOrderByWithRelationInput)
    ? (sortField as keyof Prisma.RequestOrderByWithRelationInput)
    : undefined;

  let orderBy: Prisma.RequestOrderByWithRelationInput = { createdAt: "desc" };

  if (sortableField) {
    orderBy = {
      [sortableField]: sortDirection ?? "desc",
    } satisfies Prisma.RequestOrderByWithRelationInput;
  }

  const [records, total] = await Promise.all([
    prisma.request.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
      include: {
        department: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        vendor: { select: { id: true, nameEn: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.request.count({ where }),
  ]);

  const rows: RequestRow[] = records.map(({ _count, ...rest }) => ({
    ...rest,
    itemsCount: _count.items,
  }));

  const payload: PageDto<RequestRow> = {
    rows,
    total,
    page,
    pageSize,
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

const UNIT_VALUES = ["PC", "KG", "L", "Carton", "Pallet"] as const;

const requestItemSchema = z
  .object({
    materialId: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    qty: z.number().positive(),
    unit: z.enum(UNIT_VALUES),
    note: z.string().nullable().optional(),
  })
  .refine((data) => (data.materialId && data.materialId.length > 0) || (data.name && data.name.trim().length > 0), {
    message: "Each item requires a material or a name",
    path: ["name"],
  });

const createRequestSchema = z.object({
  code: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  warehouseId: z.string().nullable().optional(),
  machineId: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),
  priority: z.enum(["Low", "Normal", "High", "Urgent"]),
  neededBy: z.string().datetime().nullable().optional(),
  description: z.string().nullable().optional(),
  items: z.array(requestItemSchema).min(1),
});

type CreateRequestInput = z.infer<typeof createRequestSchema>;

const generateRequestCode = () => {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return `REQ-${timestamp}`;
};

async function validateRelations(data: CreateRequestInput) {
  await Promise.all([
    data.departmentId
      ? prisma.department.findUniqueOrThrow({ where: { id: data.departmentId }, select: { id: true } })
      : Promise.resolve(null),
    data.warehouseId
      ? prisma.warehouse.findUniqueOrThrow({ where: { id: data.warehouseId }, select: { id: true } })
      : Promise.resolve(null),
    data.machineId
      ? prisma.machine.findUniqueOrThrow({ where: { id: data.machineId }, select: { id: true } })
      : Promise.resolve(null),
    data.vendorId
      ? prisma.vendor.findUniqueOrThrow({ where: { id: data.vendorId }, select: { id: true } })
      : Promise.resolve(null),
    ...data.items.map((item) =>
      item.materialId
        ? prisma.material.findUniqueOrThrow({ where: { id: item.materialId }, select: { id: true } })
        : Promise.resolve(null)
    ),
  ]);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createRequestSchema.parse(json);

    await validateRelations(parsed);

    const code = parsed.code?.trim() || generateRequestCode();

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          code,
          departmentId: parsed.departmentId || null,
          warehouseId: parsed.warehouseId || null,
          machineId: parsed.machineId || null,
          vendorId: parsed.vendorId || null,
          priority: parsed.priority,
          neededBy: parsed.neededBy ? new Date(parsed.neededBy) : null,
          description: parsed.description?.trim() || null,
        },
      });

      await tx.requestItem.createMany({
        data: parsed.items.map((item) => ({
          requestId: created.id,
          materialId: item.materialId ? item.materialId : null,
          name: item.materialId ? null : item.name?.trim() ?? null,
          qty: item.qty,
          unit: item.unit,
          note: item.note?.trim() || null,
        })),
      });

      await tx.requestActivity.create({
        data: {
          requestId: created.id,
          action: "Request Created",
          detail: `Request ${created.code} created`,
        },
      });

      return created;
    });

    return NextResponse.json({ id: result.id, code: result.code }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload", issues: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? (error.meta?.target as string[]).join(",")
          : (error.meta?.target as string | undefined);
        if (target && target.includes("code")) {
          return NextResponse.json({ message: "Request code must be unique" }, { status: 409 });
        }
      }
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Related entity not found" }, { status: 400 });
      }
    }

    console.error("POST /api/requests", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
