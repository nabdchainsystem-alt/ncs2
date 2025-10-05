"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Option,
  Select,
  Typography,
} from "@/components/MaterialTailwind";
import BlackBoxKpiCard from "@/components/ui/kpi/BlackBoxKpiCard";
import { useVendorInvoices, useVendors, sar } from "@/hooks/vendors";
import { VerticalBarChart } from "@/widgets/charts";
import {
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { useChartReady } from "./useChartReady";

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const numberFormatter = new Intl.NumberFormat();

export default function VendorsInvoices() {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const { data: vendorsData } = useVendors({ page: 1, pageSize: 50, status: "" });
  const vendorOptions = useMemo(() => vendorsData?.rows ?? [], [vendorsData]);

  useEffect(() => {
    if (!selectedVendorId && vendorOptions.length > 0) {
      setSelectedVendorId(vendorOptions[0].id);
    }
  }, [selectedVendorId, vendorOptions]);

  const { data, isLoading, isError, error } = useVendorInvoices(selectedVendorId, { aging: true });
  const chartState = useChartReady();

  const buckets = data?.buckets ?? { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const totalOutstanding = Object.values(buckets).reduce((acc, value) => acc + value, 0);
  const overdueOutstanding = buckets["31-60"] + buckets["61-90"] + buckets["90+"];
  const invoiceCount = data?.list.length ?? 0;

  const renderChart = () => {
    if (isError) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
          {error instanceof Error ? error.message : "Unable to load invoices"}
        </Typography>
      );
    }

    if (isLoading) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          Loading aging data…
        </Typography>
      );
    }

    if (chartState !== "ready") {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          Charts require ResizeObserver support.
        </Typography>
      );
    }

    if (!data || !(Object.values(buckets).some((value) => value > 0))) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          No aging data available.
        </Typography>
      );
    }

    return (
      <VerticalBarChart
        height={280}
        series={[
          {
            name: "Outstanding",
            data: [buckets["0-30"], buckets["31-60"], buckets["61-90"], buckets["90+"]],
          },
        ]}
        options={{
          xaxis: { categories: ["0-30", "31-60", "61-90", "90+"] },
        }}
        colors={["#2563eb"]}
      />
    );
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td className="tw-px-4 tw-py-8 tw-text-center tw-text-blue-gray-400" colSpan={6}>
            Loading invoices…
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td className="tw-px-4 tw-py-8" colSpan={6}>
            <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
              {error instanceof Error ? error.message : "Unable to load invoices"}
            </Typography>
          </td>
        </tr>
      );
    }

    if (!data || data.list.length === 0) {
      return (
        <tr>
          <td className="tw-px-4 tw-py-8 tw-text-center tw-text-blue-gray-400" colSpan={6}>
            No invoices available for this vendor.
          </td>
        </tr>
      );
    }

    const today = Date.now();

    return data.list.map((invoice) => {
      const dueTimestamp = new Date(invoice.dueDate).getTime();
      const diffDays = Math.ceil((dueTimestamp - today) / MS_IN_DAY);
      const overdue = diffDays < 0;
      const dueLabel = overdue ? `${Math.abs(diffDays)} days overdue` : `${diffDays} days left`;

      return (
        <tr key={invoice.id} className="tw-border-b tw-border-blue-gray-50 last:tw-border-0">
          <td className="tw-px-4 tw-py-3">
            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
              {invoice.number}
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              PO: {invoice.poId ?? "—"}
            </Typography>
          </td>
          <td className="tw-px-4 tw-py-3">
            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
              {formatDate(invoice.issueDate)}
            </Typography>
          </td>
          <td className="tw-px-4 tw-py-3">
            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
              {formatDate(invoice.dueDate)}
            </Typography>
            <Typography variant="small" className={`!tw-font-normal ${overdue ? "!tw-text-red-500" : "!tw-text-blue-gray-400"}`}>
              {dueLabel}
            </Typography>
          </td>
          <td className="tw-px-4 tw-py-3 tw-text-right">
            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
              {sar(invoice.amount)}
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
              Paid: {sar(invoice.paid)}
            </Typography>
          </td>
          <td className="tw-px-4 tw-py-3 tw-text-right">
            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
              {sar(invoice.outstanding)}
            </Typography>
          </td>
          <td className="tw-px-4 tw-py-3 tw-text-right">
            <Chip
              value={invoice.status}
              color={overdue ? "red" : "blue"}
              variant="ghost"
              className="tw-uppercase"
            />
          </td>
        </tr>
      );
    });
  };

  return (
    <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-4 tw-md:tw-flex-row tw-md:tw-items-center tw-md:tw-justify-between">
        <div>
          <Typography variant="h6" color="blue-gray">
            Vendor Invoices &amp; Aging
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Track outstanding balance and due invoices per vendor
          </Typography>
        </div>
        <Select
          label="Select vendor"
          value={selectedVendorId ?? undefined}
          onChange={(value) => setSelectedVendorId(value)}
          className="tw-min-w-[240px]"
        >
          {vendorOptions.map((vendor) => (
            <Option key={vendor.id} value={vendor.id}>
              {vendor.nameEn}
            </Option>
          ))}
        </Select>
      </CardHeader>
      <CardBody className="tw-space-y-6">
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-3">
          <BlackBoxKpiCard
            icon={<BanknotesIcon className="tw-h-6 tw-w-6" />}
            title="Open Balance"
            value={sar(totalOutstanding)}
            subtitle="Outstanding invoice value"
          />
          <BlackBoxKpiCard
            icon={<ExclamationTriangleIcon className="tw-h-6 tw-w-6" />}
            title="Overdue"
            value={sar(overdueOutstanding)}
            subtitle="Past-due balance"
          />
          <BlackBoxKpiCard
            icon={<DocumentTextIcon className="tw-h-6 tw-w-6" />}
            title="Invoices"
            value={numberFormatter.format(invoiceCount)}
            subtitle="Last 20 invoices tracked"
          />
        </div>

        <div>{renderChart()}</div>

        <div className="tw-overflow-x-auto">
          <table className="tw-min-w-full tw-table-auto">
            <thead>
              <tr className="tw-border-b tw-border-blue-gray-50">
                {[
                  "Invoice",
                  "Issued",
                  "Due",
                  "Amount",
                  "Outstanding",
                  "Status",
                ].map((header) => (
                  <th key={header} className="tw-px-4 tw-py-3 tw-text-left">
                    <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                      {header}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
