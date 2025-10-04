"use client";

import { ReactNode, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  Option,
  Select,
  Switch,
  Textarea,
  Typography,
} from "@/components/MaterialTailwind";

export type BaseModalProps = {
  open: boolean;
  onClose: () => void;
};

export function TableCard({
  title,
  subtitle,
  onAddNew,
  children,
}: {
  title: string;
  subtitle: string;
  onAddNew: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-shadow-sm">
      <CardHeader
        floated={false}
        shadow={false}
        className="tw-flex tw-flex-col tw-items-start tw-gap-6 tw-rounded-none tw-p-6 md:tw-flex-row md:tw-items-center md:tw-justify-between"
      >
        <div className="tw-flex tw-flex-col tw-gap-1">
          <Typography variant="h5" color="blue-gray">
            {title}
          </Typography>
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
            {subtitle}
          </Typography>
        </div>
        <Button color="gray" onClick={onAddNew}>
          Add New
        </Button>
      </CardHeader>
      <CardBody className="tw-overflow-x-auto tw-p-0">{children}</CardBody>
    </Card>
  );
}

export function useModalState() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
  };
}

export {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  Option,
  Select,
  Switch,
  Textarea,
  Typography,
};
