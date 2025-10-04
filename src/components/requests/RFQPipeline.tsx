"use client";

import {
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@/components/MaterialTailwind";

const columns = [
  "QUOTATION NO",
  "REQUEST NO",
  "VENDOR",
  "ITEMS",
  "VALUE (SAR)",
  "STATUS",
  "ACTIONS",
] as const;

export default function RFQPipeline() {
  return (
    <Card className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader
        floated={false}
        shadow={false}
        className="tw-rounded-none tw-border-b tw-border-blue-gray-50 tw-p-6"
      >
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            RFQ Pipeline
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            Track vendor quotations across sourcing stages
          </Typography>
        </div>
      </CardHeader>
      <CardBody className="tw-overflow-x-auto tw-p-0">
        <table className="tw-min-w-max tw-w-full tw-table-auto">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                  <Typography
                    variant="small"
                    color="blue-gray"
                    className="tw-text-left tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                  >
                    {column}
                  </Typography>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="tw-px-6 tw-py-12">
                <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-text-center">
                  <Typography variant="h6" color="blue-gray">
                    No RFQs yet
                  </Typography>
                  <Typography
                    variant="small"
                    className="!tw-font-normal !tw-text-blue-gray-500"
                  >
                    RFQs will appear once requests move into sourcing.
                  </Typography>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
