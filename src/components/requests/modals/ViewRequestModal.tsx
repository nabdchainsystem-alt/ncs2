"use client";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Dialog,
  DialogBody,
  DialogHeader,
  Typography,
} from "@/components/MaterialTailwind";
import { useRequest } from "@/hooks/requests";

const STATUS_COLOR: Record<string, "blue" | "amber" | "green" | "red"> = {
  OPEN: "blue",
  PENDING: "amber",
  CLOSED: "green",
  CANCELLED: "red",
};

const PRIORITY_COLOR: Record<string, "blue" | "green" | "amber" | "red"> = {
  Low: "green",
  Normal: "blue",
  High: "amber",
  Urgent: "red",
};

type Props = {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function ViewRequestModal({ requestId, open, onClose }: Props) {
  const { data, isLoading, isError, error } = useRequest(open ? requestId : null);

  return (
    <Dialog open={open} handler={onClose} size="xl" className="tw-max-h-[90vh]">
      <DialogHeader className="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-rounded-t-xl tw-border-b tw-border-blue-gray-50">
        <Typography variant="h5" color="blue-gray">
          Request Details
        </Typography>
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
          Comprehensive view of the purchase request timeline and items.
        </Typography>
      </DialogHeader>
      <DialogBody className="tw-space-y-6 tw-overflow-y-auto">
        {isLoading ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            Loading request...
          </Typography>
        ) : null}
        {isError ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
            {error instanceof Error ? error.message : "Failed to load request"}
          </Typography>
        ) : null}
        {data ? (
          <div className="tw-grid tw-gap-4">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
              <Typography variant="h6" color="blue-gray">
                {data.code}
              </Typography>
              <Chip
                value={data.status}
                color={STATUS_COLOR[data.status] ?? "blue"}
                variant="ghost"
                className="tw-capitalize"
              />
              <Chip
                value={data.priority}
                color={PRIORITY_COLOR[data.priority] ?? "blue"}
                variant="ghost"
                className="tw-capitalize"
              />
            </div>
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
              <Detail label="Department" value={data.department?.name} />
              <Detail label="Warehouse" value={data.warehouse?.name} />
              <Detail label="Machine" value={data.machine?.name} />
              <Detail label="Vendor" value={data.vendor?.nameEn} />
              <Detail
                label="Needed by"
                value={data.neededBy ? new Date(data.neededBy).toLocaleDateString() : undefined}
              />
              <Detail
                label="Created"
                value={new Date(data.createdAt).toLocaleString()}
              />
            </div>
            {data.description ? (
              <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
                <CardBody>
                  <Typography variant="h6" color="blue-gray" className="tw-mb-2">
                    Description
                  </Typography>
                  <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                    {data.description}
                  </Typography>
                </CardBody>
              </Card>
            ) : null}
            <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
              <CardBody className="tw-overflow-x-auto tw-p-0">
                <table className="tw-min-w-max tw-w-full tw-table-auto">
                  <thead>
                    <tr>
                      {ITEM_HEADERS.map((header) => (
                        <th key={header} className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                          <Typography
                            variant="small"
                            color="blue-gray"
                            className="tw-text-left tw-text-xs !tw-font-semibold tw-uppercase tw-opacity-70"
                          >
                            {header}
                          </Typography>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="tw-px-6 tw-py-8">
                          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500 tw-text-center">
                            No items added to this request.
                          </Typography>
                        </td>
                      </tr>
                    ) : (
                      data.items.map((item) => (
                        <tr key={item.id}>
                          <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                            <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-600">
                              {item.material?.code ? `${item.material.code} · ${item.material.name}` : "—"}
                            </Typography>
                          </td>
                          <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                              {item.name ?? item.material?.name ?? "—"}
                            </Typography>
                          </td>
                          <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                              {item.qty}
                            </Typography>
                          </td>
                          <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                              {item.unit}
                            </Typography>
                          </td>
                          <td className="tw-border-b tw-border-blue-gray-50 tw-px-6 tw-py-4">
                            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                              {item.note ?? "—"}
                            </Typography>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </div>
        ) : null}
      </DialogBody>
      <div className="tw-flex tw-justify-end tw-gap-3 tw-px-6 tw-pb-4">
        <Button variant="text" color="blue-gray" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}

type DetailProps = {
  label: string;
  value?: string | null;
};

function Detail({ label, value }: DetailProps) {
  return (
    <div>
      <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500 tw-uppercase tw-text-xs">
        {label}
      </Typography>
      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-600">
        {value ?? "—"}
      </Typography>
    </div>
  );
}

const ITEM_HEADERS = ["Material", "Name", "Qty", "Unit", "Note"] as const;
