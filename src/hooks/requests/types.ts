export type RequestRowDto = {
  id: string;
  code: string;
  departmentId: string | null;
  warehouseId: string | null;
  machineId: string | null;
  vendorId: string | null;
  priority: "Low" | "Normal" | "High" | "Urgent";
  neededBy: string | null;
  description: string | null;
  status: "OPEN" | "PENDING" | "CLOSED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  department?: { id: string; name: string | null } | null;
  warehouse?: { id: string; name: string | null } | null;
  machine?: { id: string; name: string | null } | null;
  vendor?: { id: string; nameEn: string | null } | null;
};

export type RequestDetailDto = RequestRowDto & {
  items: Array<{
    id: string;
    materialId: string | null;
    name: string | null;
    qty: number;
    unit: string;
    note: string | null;
    material?: { id: string; name: string | null; unit: string; code: string } | null;
  }>;
};
