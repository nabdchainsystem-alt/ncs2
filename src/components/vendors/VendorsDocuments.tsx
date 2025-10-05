"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  IconButton,
  Input,
  Typography,
} from "@/components/MaterialTailwind";
import { ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/24/outline";

const formatDate = (value: Date) =>
  value.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatSize = (sizeInKb: number) => {
  if (sizeInKb >= 1024) {
    return `${(sizeInKb / 1024).toFixed(2)} MB`;
  }
  return `${sizeInKb.toFixed(0)} KB`;
};

type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  sizeKb: number;
  uploadedAt: Date;
};

export default function VendorsDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", sizeKb: "" });
  const [error, setError] = useState<string | null>(null);

  const orderedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
      ),
    [documents]
  );

  const resetModal = () => {
    setForm({ name: "", type: "", sizeKb: "" });
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Document name is required");
      return;
    }
    if (!form.type.trim()) {
      setError("Document type is required");
      return;
    }
    const sizeNumber = Number(form.sizeKb);
    if (!Number.isFinite(sizeNumber) || sizeNumber <= 0) {
      setError("File size must be a positive number");
      return;
    }

    setDocuments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        type: form.type.trim(),
        sizeKb: sizeNumber,
        uploadedAt: new Date(),
      },
    ]);

    setIsOpen(false);
    resetModal();
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleDownload = (document: DocumentRecord) => {
    console.info("Download document placeholder", document);
  };

  return (
    <>
      <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
        <CardHeader floated={false} shadow={false} className="tw-flex tw-flex-col tw-gap-4 md:tw-flex-row md:tw-items-center md:tw-justify-between">
          <div>
            <Typography variant="h6" color="blue-gray">
              Vendor Documents
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Contracts, certificates, and compliance records
            </Typography>
          </div>
          <Button color="blue" onClick={() => setIsOpen(true)}>
            Upload Document
          </Button>
        </CardHeader>
        <CardBody className="tw-overflow-x-auto">
          <table className="tw-min-w-full tw-table-auto">
            <thead>
              <tr className="tw-border-b tw-border-blue-gray-50">
                {[
                  "File",
                  "Type",
                  "Size",
                  "Uploaded",
                  "Actions",
                ].map((header) => (
                  <th key={header} className="tw-px-4 tw-py-3 tw-text-left">
                    <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                      {header}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedDocuments.length === 0 ? (
                <tr>
                  <td className="tw-px-4 tw-py-8 tw-text-center tw-text-blue-gray-400" colSpan={5}>
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : (
                orderedDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className="tw-border-b tw-border-blue-gray-50 last:tw-border-0"
                  >
                    <td className="tw-px-4 tw-py-3">
                      <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                        {document.name}
                      </Typography>
                    </td>
                    <td className="tw-px-4 tw-py-3">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        {document.type}
                      </Typography>
                    </td>
                    <td className="tw-px-4 tw-py-3">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        {formatSize(document.sizeKb)}
                      </Typography>
                    </td>
                    <td className="tw-px-4 tw-py-3">
                      <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                        {formatDate(document.uploadedAt)}
                      </Typography>
                    </td>
                    <td className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-3">
                      <IconButton variant="outlined" color="gray" onClick={() => handleDownload(document)}>
                        <ArrowDownTrayIcon className="tw-h-5 tw-w-5" />
                      </IconButton>
                      <IconButton variant="outlined" color="red" onClick={() => handleDelete(document.id)}>
                        <TrashIcon className="tw-h-5 tw-w-5" />
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Dialog open={isOpen} handler={() => { setIsOpen(false); resetModal(); }}>
        <DialogHeader>Upload document</DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="tw-space-y-4">
            {error ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {error}
              </Typography>
            ) : null}
            <Input
              crossOrigin="anonymous"
              label="Document name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              crossOrigin="anonymous"
              label="Type (e.g. CR, VAT, Insurance)"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              required
            />
            <Input
              crossOrigin="anonymous"
              label="Size (KB)"
              type="number"
              value={form.sizeKb}
              onChange={(event) => setForm((prev) => ({ ...prev, sizeKb: event.target.value }))}
              required
            />
          </DialogBody>
          <DialogFooter className="tw-space-x-2">
            <Button
              variant="text"
              color="gray"
              onClick={() => {
                setIsOpen(false);
                resetModal();
              }}
            >
              Cancel
            </Button>
            <Button color="blue" type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
