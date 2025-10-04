import { useMemo } from "react";
import useSWR from "swr";

export type RequestRow = {
  id: string;
  code: string;
  createdAt: string;
  departmentName?: string | null;
  warehouseName?: string | null;
  machineName?: string | null;
  status: "OPEN" | "PENDING" | "CLOSED" | "CANCELLED";
  priority: "Low" | "Normal" | "High" | "Urgent";
};

const STATUS_VALUES = new Set<RequestRow["status"]>(["OPEN", "PENDING", "CLOSED", "CANCELLED"]);
const PRIORITY_VALUES = new Set<RequestRow["priority"]>(["Low", "Normal", "High", "Urgent"]);

export type PageDto<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

type Params = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  priority?: string;
  dept?: string;
  wh?: string;
  machine?: string;
  vendor?: string;
  sort?: string;
};

export function useRequests(params: Params) {
  const { page, pageSize } = params;

  const searchParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (params.search) sp.set("search", params.search);
    if (params.status) sp.set("status", params.status);
    if (params.priority) sp.set("priority", params.priority);
    if (params.dept) sp.set("dept", params.dept);
    if (params.wh) sp.set("wh", params.wh);
    if (params.machine) sp.set("machine", params.machine);
    if (params.vendor) sp.set("vendor", params.vendor);
    if (params.sort) sp.set("sort", params.sort);
    return sp.toString();
  }, [page, pageSize, params.search, params.status, params.priority, params.dept, params.wh, params.machine, params.vendor, params.sort]);

  const key = useMemo(() => `/api/requests?${searchParams}`, [searchParams]);

  const { data, error, isLoading, mutate } = useSWR<PageDto<RequestRow>>(key, async (url: string) => {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return {
        rows: [],
        total: 0,
        page,
        pageSize,
      } satisfies PageDto<RequestRow>;
    }

    const json = await response.json().catch(() => null);

    if (!json || !Array.isArray(json.rows)) {
      return {
        rows: [],
        total: 0,
        page,
        pageSize,
      } satisfies PageDto<RequestRow>;
    }

    const safeRows: RequestRow[] = json.rows.map((row: any) => {
      const statusValue = STATUS_VALUES.has(row.status) ? row.status : "OPEN";
      const priorityValue = PRIORITY_VALUES.has(row.priority) ? row.priority : "Normal";

      return {
        id: String(row.id ?? ""),
        code: String(row.code ?? ""),
        createdAt: String(row.createdAt ?? new Date().toISOString()),
        departmentName: row.department?.name ?? row.departmentName ?? null,
        warehouseName: row.warehouse?.name ?? row.warehouseName ?? null,
        machineName: row.machine?.name ?? row.machineName ?? null,
        status: statusValue,
        priority: priorityValue,
      } satisfies RequestRow;
    }).filter((row: RequestRow) => row.id && row.code);

    return {
      rows: safeRows,
      total: typeof json.total === "number" ? json.total : safeRows.length,
      page: typeof json.page === "number" ? json.page : page,
      pageSize: typeof json.pageSize === "number" ? json.pageSize : pageSize,
    } satisfies PageDto<RequestRow>;
  });

  const fallback: PageDto<RequestRow> = data ?? {
    rows: [],
    total: 0,
    page,
    pageSize,
  };

  return {
    ...fallback,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
}
