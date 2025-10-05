"use client";

import { Card, CardBody, CardHeader, Typography } from "@/components/MaterialTailwind";
import { sar, useVendorsAggregates } from "@/hooks/vendors";
import { PieChart, MixedChart, VerticalBarChart } from "@/widgets/charts";

import { useChartReady } from "./useChartReady";

const numberFormatter = new Intl.NumberFormat();

function ChartStateMessage({ message }: { message: string }) {
  return (
    <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
      {message}
    </Typography>
  );
}

export default function VendorsAnalytics() {
  const aggregates = useVendorsAggregates();
  const chartState = useChartReady();

  const ordersByStatusData = aggregates.ordersByStatus.data;
  const spendByMonthData = aggregates.spendByMonth.data;
  const onTimeData = aggregates.onTimeByVendor.data;
  const leadTimeData = aggregates.leadTimeByVendor.data;
  const spendTopData = aggregates.spendTop.data;
  const materialsTopData = aggregates.materialsTop.data;

  const isLoading = aggregates.isLoading;
  const hasChartSupport = chartState === "ready";

  const renderChartOrMessage = (hasData: boolean, content: React.ReactNode) => {
    if (aggregates.error) {
      return <ChartStateMessage message="Unable to load data." />;
    }
    if (isLoading) {
      return <ChartStateMessage message="Loading…" />;
    }
    if (!hasChartSupport) {
      return <ChartStateMessage message="Charts require ResizeObserver support." />;
    }
    if (!hasData) {
      return <ChartStateMessage message="No data available." />;
    }
    return content;
  };

  return (
    <section className="tw-grid tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-2">
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-1">
          <Typography variant="h6" color="blue-gray">
            Orders by Status
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Distribution of open vs closed vendor purchase orders
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {renderChartOrMessage(
            Boolean(ordersByStatusData?.data?.some((value) => value > 0)),
            ordersByStatusData ? (
              <PieChart
                height={300}
                labels={ordersByStatusData.labels}
                series={ordersByStatusData.data}
                colors={["#2563eb", "#0ea5e9", "#94a3b8"]}
              />
            ) : null
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-1">
          <Typography variant="h6" color="blue-gray">
            Spend by Month
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Combined orders count and spend (rolling 12 months)
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {renderChartOrMessage(
            Boolean(
              spendByMonthData?.labels.length &&
                spendByMonthData.series.some((series) => series.data.some((value) => value > 0))
            ),
            spendByMonthData ? (
              <MixedChart
                height={320}
                series={spendByMonthData.series.map((series, index) => ({
                  type: index === 0 ? "column" : "line",
                  name: series.name,
                  data: series.data,
                }))}
                options={{
                  xaxis: { categories: spendByMonthData.labels },
                  stroke: {
                    width: [0, 4],
                  },
                }}
              />
            ) : null
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-1">
          <Typography variant="h6" color="blue-gray">
            Top 10 Vendors by Spend
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Orders, total spend, and average order value
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {aggregates.spendTop.error ? (
            <ChartStateMessage message="Unable to load spend leaderboard." />
          ) : spendTopData ? (
            spendTopData.rows.length ? (
              <div className="tw-overflow-x-auto">
                <table className="tw-min-w-full tw-table-auto">
                  <thead>
                    <tr className="tw-border-b tw-border-blue-gray-50">
                      <th className="tw-px-4 tw-py-2 tw-text-left">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Vendor
                        </Typography>
                      </th>
                      <th className="tw-px-4 tw-py-2 tw-text-right">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Orders
                        </Typography>
                      </th>
                      <th className="tw-px-4 tw-py-2 tw-text-right">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Total Spend
                        </Typography>
                      </th>
                      <th className="tw-px-4 tw-py-2 tw-text-right">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Avg Order
                        </Typography>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {spendTopData.rows.map((row) => (
                      <tr key={row.vendor} className="tw-border-b tw-border-blue-gray-50 last:tw-border-0">
                        <td className="tw-px-4 tw-py-3">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {row.vendor}
                          </Typography>
                        </td>
                        <td className="tw-px-4 tw-py-3 tw-text-right">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {numberFormatter.format(row.orders)}
                          </Typography>
                        </td>
                        <td className="tw-px-4 tw-py-3 tw-text-right">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {sar(row.total)}
                          </Typography>
                        </td>
                        <td className="tw-px-4 tw-py-3 tw-text-right">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {sar(row.aov)}
                          </Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ChartStateMessage message="No data available." />
            )
          ) : (
            <ChartStateMessage message="Loading…" />
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-1">
          <Typography variant="h6" color="blue-gray">
            Top Materials by Vendor Spend
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Material-level insight across supplier spend
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {aggregates.materialsTop.error ? (
            <ChartStateMessage message="Unable to load materials leaderboard." />
          ) : materialsTopData ? (
            materialsTopData.rows.length ? (
              <div className="tw-overflow-x-auto">
                <table className="tw-min-w-full tw-table-auto">
                  <thead>
                    <tr className="tw-border-b tw-border-blue-gray-50">
                      <th className="tw-px-4 tw-py-2 tw-text-left">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Material
                        </Typography>
                      </th>
                      <th className="tw-px-4 tw-py-2 tw-text-right">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Orders
                        </Typography>
                      </th>
                      <th className="tw-px-4 tw-py-2 tw-text-right">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Spend
                        </Typography>
                      </th>
                      <th className="tw-px-4 tw-py-2 tw-text-right">
                        <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                          Avg Price
                        </Typography>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialsTopData.rows.map((row) => (
                      <tr key={row.material} className="tw-border-b tw-border-blue-gray-50 last:tw-border-0">
                        <td className="tw-px-4 tw-py-3">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {row.material}
                          </Typography>
                        </td>
                        <td className="tw-px-4 tw-py-3 tw-text-right">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {numberFormatter.format(row.orders)}
                          </Typography>
                        </td>
                        <td className="tw-px-4 tw-py-3 tw-text-right">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {sar(row.spend)}
                          </Typography>
                        </td>
                        <td className="tw-px-4 tw-py-3 tw-text-right">
                          <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                            {sar(row.avg)}
                          </Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ChartStateMessage message="No data available." />
            )
          ) : (
            <ChartStateMessage message="Loading…" />
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-1">
          <Typography variant="h6" color="blue-gray">
            On-Time % by Vendor
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Delivery performance across the vendor base
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {renderChartOrMessage(
            Boolean(onTimeData?.data?.some((value) => value > 0)),
            onTimeData ? (
              <VerticalBarChart
                height={320}
                series={[{ name: "On-Time %", data: onTimeData.data }]}
                options={{
                  xaxis: {
                    categories: onTimeData.labels,
                  },
                  yaxis: {
                    max: 100,
                  },
                }}
                colors={["#0ea5e9"]}
              />
            ) : null
          )}
        </CardBody>
      </Card>

      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-space-y-1">
          <Typography variant="h6" color="blue-gray">
            Average Lead Time by Vendor
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Based on completed order transfers
          </Typography>
        </CardHeader>
        <CardBody className="tw-space-y-4">
          {renderChartOrMessage(
            Boolean(leadTimeData?.data?.some((value) => value > 0)),
            leadTimeData ? (
              <VerticalBarChart
                height={320}
                series={[{ name: "Avg Lead Days", data: leadTimeData.data }]}
                options={{
                  xaxis: {
                    categories: leadTimeData.labels,
                  },
                }}
                colors={["#6366f1"]}
              />
            ) : null
          )}
        </CardBody>
      </Card>
    </section>
  );
}
