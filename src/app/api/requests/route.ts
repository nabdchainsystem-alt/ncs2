export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Prisma, RequestStatus, Priority } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import { parsePaginationParams, PageDto } from "@/lib/api/pagination";
import { ok, fail, readJson } from "@/server/api-helpers";

type RequestRowRecord = Prisma.RequestGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
    warehouse: { select: { id: true; name: true } };
    machine: { select: { id: true; name: true } };
    vendor: { select: { id: true; nameEn: true } };
    items: {
      select: {
        name: true;
        unit: true;
        qty: true;
        material: { select: { code: true; name: true } };
      };
      orderBy: { id: "asc" };
      take: 1;
    };
    _count: { select: { items: true } };
  };
}>;

type RequestRow = Omit<RequestRowRecord, "_count" | "items"> & {
  itemsCount: number;
  primaryItemCode: string | null;
  primaryItemName: string | null;
};

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
  try {
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
          {
            items: {
              some: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { material: { code: { contains: search, mode: "insensitive" } } },
                  { material: { name: { contains: search, mode: "insensitive" } } },
                ],
              },
            },
          },
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
          items: {
            select: {
              name: true,
              unit: true,
              qty: true,
              material: { select: { code: true, name: true } },
            },
            orderBy: { id: "asc" },
            take: 1,
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    const rows: RequestRow[] = records.map(({ _count, items, ...rest }) => {
      const primaryItem = items[0] ?? null;

      return {
        ...rest,
        itemsCount: _count.items,
        primaryItemCode: primaryItem?.material?.code ?? null,
        primaryItemName: primaryItem?.material?.name ?? primaryItem?.name ?? null,
      } satisfies RequestRow;
    });

    const payload: PageDto<RequestRow> = {
      rows,
      total,
      page,
      pageSize,
    };

    return ok(payload);
  } catch (error: any) {
    console.error("GET /api/requests", error);
    return fail(500, "Server error", error?.message);
  }
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
    const json = await readJson(request);
    const parsed = createRequestSchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    try {
      await validateRelations(data);
    } catch (relationError) {
      if (
        relationError instanceof Prisma.PrismaClientKnownRequestError &&
        relationError.code === "P2025"
      ) {
        return fail(404, "Related entity not found");
      }
      if (relationError instanceof Prisma.NotFoundError) {
        return fail(404, "Related entity not found");
      }
      throw relationError;
    }

    const code = data.code?.trim() || generateRequestCode();

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          code,
          departmentId: data.departmentId || null,
          warehouseId: data.warehouseId || null,
          machineId: data.machineId || null,
          vendorId: data.vendorId || null,
          priority: data.priority,
          neededBy: data.neededBy ? new Date(data.neededBy) : null,
          description: data.description?.trim() || null,
        },
      });

      await tx.requestItem.createMany({
        data: data.items.map((item) => ({
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

    return ok({ id: result.id, code: result.code }, 201);
  } catch (error: any) {
    if (error?.message === "INVALID_CONTENT_TYPE") {
      return fail(415, "Content-Type must be application/json");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? (error.meta?.target as string[]).join(",")
          : (error.meta?.target as string | undefined);
        if (target && target.includes("code")) {
          return fail(409, "Request code must be unique");
        }
      }
      if (error.code === "P2025") {
        return fail(404, "Related entity not found");
      }
    }

    console.error("POST /api/requests", error);
    return fail(500, "Server error", error?.message);
  }
}
