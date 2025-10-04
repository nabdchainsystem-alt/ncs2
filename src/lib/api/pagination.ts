export type PaginationParams = {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
};

export function parsePaginationParams(url: URL): PaginationParams {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize") ?? "10") || 10));
  const search = url.searchParams.get("search")?.trim() || undefined;
  const sortRaw = url.searchParams.get("sort")?.trim();
  let sortField: string | undefined;
  let sortDirection: "asc" | "desc" | undefined;

  if (sortRaw) {
    const [field, direction] = sortRaw.split(":");
    if (field && (direction === "asc" || direction === "desc")) {
      sortField = field;
      sortDirection = direction;
    }
  }

  return {
    page,
    pageSize,
    search,
    sortField,
    sortDirection,
  };
}

export type PageDto<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};
