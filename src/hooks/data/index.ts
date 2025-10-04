import { usePaged } from "./usePaged";

export function useDepartments(params: { page: number; pageSize: number; search?: string; sort?: string }) {
  return usePaged<DepartmentDto>("/api/departments", params);
}

export function useWarehouses(params: { page: number; pageSize: number; search?: string; sort?: string }) {
  return usePaged<WarehouseDto>("/api/warehouses", params);
}

export function useMaterials(params: { page: number; pageSize: number; search?: string; sort?: string }) {
  return usePaged<MaterialDto>("/api/materials", params);
}

export function useVendors(params: { page: number; pageSize: number; search?: string; sort?: string }) {
  return usePaged<VendorDto>("/api/vendors", params);
}

export function useMachines(params: { page: number; pageSize: number; search?: string; sort?: string }) {
  return usePaged<MachineDto>("/api/machines", params);
}

export type DepartmentDto = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseDto = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  sizeM2: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MaterialDto = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  warehouseId: string | null;
  warehouse?: { id: string; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorDto = {
  id: string;
  nameEn: string;
  nameAr: string | null;
  category: string;
  subCategory: string | null;
  contactPerson: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  companyNumber: string | null;
  address: string | null;
  status: string | null;
  cr: string | null;
  crExpiry: string | null;
  vat: string | null;
  vatExpiry: string | null;
  bank: string | null;
  iban: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MachineDto = {
  id: string;
  name: string;
  code: string;
  status: string;
  notes: string | null;
  departmentId: string | null;
  department?: { id: string; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
};
