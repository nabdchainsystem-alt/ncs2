import VendorsHero from "@/components/vendors/VendorsHero";
import VendorsKpiRow from "@/components/vendors/VendorsKpiRow";
import VendorsPageContent from "@/components/vendors/VendorsPageContent";
import VendorsAnalytics from "@/components/vendors/VendorsAnalytics";
import VendorsInvoices from "@/components/vendors/VendorsInvoices";
import VendorsDocuments from "@/components/vendors/VendorsDocuments";

export default function VendorsPage() {
  return (
    <div className="tw-mt-8 tw-mb-4 tw-space-y-6">
      <VendorsHero />
      <VendorsKpiRow />
      <VendorsPageContent />
      <VendorsAnalytics />
      <VendorsInvoices />
      <VendorsDocuments />
    </div>
  );
}
