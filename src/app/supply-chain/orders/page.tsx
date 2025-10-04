import OrdersHero from "@/components/orders/OrdersHero";
import OrdersKpiBlock from "@/components/orders/OrdersKpiBlock";
import OrdersRecentActivity from "@/components/orders/OrdersRecentActivity";
import OrdersByDeptChart from "@/components/orders/charts/OrdersByDeptChart";
import OrdersFollowupCalendar from "@/components/orders/OrdersFollowupCalendar";
import AllPurchaseOrdersTable from "@/components/orders/AllPurchaseOrdersTable";
import UrgentOrdersOverview from "@/components/orders/analytics/UrgentOrdersOverview";
import SpendAnalysisClosedOrders from "@/components/orders/analytics/SpendAnalysisClosedOrders";
import SpendByMachineCategory from "@/components/orders/analytics/SpendByMachineCategory";
import MonthlyTrendsSection from "@/components/orders/analytics/MonthlyTrendsSection";
import DeliveryPerformanceSection from "@/components/orders/analytics/DeliveryPerformanceSection";

export default function OrdersPage() {
  return (
    <div className="tw-mt-8 tw-mb-4 tw-space-y-6">
      <OrdersHero />
      <OrdersKpiBlock />
      <section className="tw-grid tw-grid-cols-1 tw-items-stretch tw-gap-6 xl:tw-grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)_minmax(0,1.2fr)]">
        <div className="tw-flex tw-h-full tw-flex-col">
          <OrdersRecentActivity />
        </div>
        <div className="tw-flex tw-h-full tw-flex-col">
          <OrdersByDeptChart />
        </div>
        <div className="tw-flex tw-h-full tw-flex-col">
          <OrdersFollowupCalendar />
        </div>
      </section>
      <AllPurchaseOrdersTable />
      <UrgentOrdersOverview />
      <SpendAnalysisClosedOrders />
      <SpendByMachineCategory />
      <MonthlyTrendsSection />
      <DeliveryPerformanceSection />
    </div>
  );
}
