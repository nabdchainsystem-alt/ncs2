import AllRequestsTable from "@/components/requests/AllRequestsTable";
import RequestsKpiBlock from "@/components/requests/RequestsKpiBlock";
import Requestshero from "@/components/requests/Requestshero";
import RFQPipeline from "@/components/requests/RFQPipeline";
import RecentActivities from "@/components/requests/RecentActivities";
import UrgentDepartmentsChart from "@/components/requests/UrgentDepartmentsChart";
import FollowUpCalendar from "@/components/requests/FollowUpCalendar";

export default function RequestsPage() {
  return (
    <div className="tw-mt-8 tw-mb-4 tw-space-y-6">
      <Requestshero />
      <RequestsKpiBlock />
      <div className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)_minmax(0,1.2fr)]">
        <RecentActivities />
        <UrgentDepartmentsChart />
        <FollowUpCalendar />
      </div>
      <AllRequestsTable />
      <RFQPipeline />
    </div>
  );
}
