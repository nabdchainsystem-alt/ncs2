import DepartmentsTable from "@/components/data/DepartmentsTable";
import MachinesTable from "@/components/data/MachinesTable";
import MaterialsTable from "@/components/data/MaterialsTable";
import VendorsTable from "@/components/data/VendorsTable";
import WarehousesTable from "@/components/data/WarehousesTable";

export default function DataPage() {
  return (
    <div className="tw-mt-8 tw-mb-4 tw-space-y-6">
      <section className="tw-relative tw-w-full tw-overflow-hidden tw-rounded-xl">
        <img
          src="/img/data/hero.jpeg"
          alt="Data insights background"
          className="tw-h-[260px] tw-w-full tw-object-cover"
          aria-hidden="true"
        />
        <div className="tw-absolute tw-inset-0 tw-bg-black/30" />
        <div className="tw-absolute tw-inset-0 tw-flex tw-flex-col tw-justify-center tw-gap-2 tw-px-8 tw-text-white">
          <h1 className="tw-text-3xl tw-font-bold">Data Overview</h1>
          <p className="tw-text-lg tw-opacity-90">
            Real-time visibility into operational performance
          </p>
        </div>
      </section>
      <DepartmentsTable />
      <WarehousesTable />
      <MaterialsTable />
      <VendorsTable />
      <MachinesTable />
    </div>
  );
}
