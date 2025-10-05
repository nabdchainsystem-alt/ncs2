"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Drawer,
  IconButton,
  Input,
  Tabs,
  TabsBody,
  TabsHeader,
  Tab,
  TabPanel,
  Textarea,
  Typography,
} from "@/components/MaterialTailwind";
import {
  useVendor,
  useVendorInvoices,
  useVendorFollowups,
  sar,
} from "@/hooks/vendors";
import { VerticalBarChart } from "@/widgets/charts";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useChartReady } from "./useChartReady";

const TABS = ["overview", "performance", "invoices", "documents", "notes"] as const;

type TabValue = (typeof TABS)[number];

type Props = {
  vendorId: string | null;
  open: boolean;
  onClose: () => void;
};

type NoteRecord = {
  id: string;
  text: string;
  createdAt: Date;
};

type DrawerDocument = {
  id: string;
  name: string;
  type: string;
  uploadedAt: Date;
};

export default function VendorProfileDrawer({ vendorId, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [documents, setDocuments] = useState<DrawerDocument[]>([]);
  const [documentModal, setDocumentModal] = useState(false);
  const [documentForm, setDocumentForm] = useState({ name: "", type: "" });
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [followupModal, setFollowupModal] = useState(false);
  const [followupForm, setFollowupForm] = useState({ title: "", dueAt: "", notes: "" });
  const [followupError, setFollowupError] = useState<string | null>(null);

  const { data: vendor, isLoading } = useVendor(open ? vendorId : null);
  const invoices = useVendorInvoices(open ? vendorId : null, { aging: true });
  const followups = useVendorFollowups(open ? vendorId : null, {});
  const chartState = useChartReady();

  const stats = vendor?.stats ?? {
    totalOrders: 0,
    spend: 0,
    onTimePct: 0,
    avgLeadDays: 0,
  };

  const handleClose = () => {
    setActiveTab("overview");
    setFollowupModal(false);
    setDocumentModal(false);
    onClose();
  };

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    setNotes((prev) => [
      {
        id: crypto.randomUUID(),
        text: noteDraft.trim(),
        createdAt: new Date(),
      },
      ...prev,
    ]);
    setNoteDraft("");
  };

  const handleDocumentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentForm.name.trim()) {
      setDocumentError("Document name is required");
      return;
    }
    if (!documentForm.type.trim()) {
      setDocumentError("Document type is required");
      return;
    }
    setDocuments((prev) => [
      {
        id: crypto.randomUUID(),
        name: documentForm.name.trim(),
        type: documentForm.type.trim(),
        uploadedAt: new Date(),
      },
      ...prev,
    ]);
    setDocumentModal(false);
    setDocumentForm({ name: "", type: "" });
    setDocumentError(null);
  };

  const handleFollowupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!followupForm.title.trim()) {
      setFollowupError("Title is required");
      return;
    }
    if (!followupForm.dueAt) {
      setFollowupError("Due date is required");
      return;
    }
    try {
      await followups.create({
        title: followupForm.title.trim(),
        dueAt: followupForm.dueAt,
        notes: followupForm.notes.trim() || undefined,
      });
      setFollowupModal(false);
      setFollowupForm({ title: "", dueAt: "", notes: "" });
      setFollowupError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create follow-up";
      setFollowupError(message);
    }
  };

  const overviewContent = () => {
    if (isLoading) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          Loading vendor details…
        </Typography>
      );
    }

    if (!vendor) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          Select a vendor to view details.
        </Typography>
      );
    }

    return (
      <div className="tw-space-y-4">
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
          <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
            <CardBody className="tw-space-y-2">
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Company
              </Typography>
              <Typography variant="h6" className="!tw-font-semibold !tw-text-blue-gray-900">
                {vendor.nameEn}
              </Typography>
              {vendor.category ? (
                <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                  {vendor.category}
                  {vendor.subCategory ? ` • ${vendor.subCategory}` : ""}
                </Typography>
              ) : null}
              <Chip
                value={vendor.status ?? "Unknown"}
                color={vendor.status === "Active" ? "green" : "blue-gray"}
                variant="ghost"
                className="tw-w-fit tw-uppercase"
              />
            </CardBody>
          </Card>
          <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
            <CardBody className="tw-space-y-2">
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Primary Contact
              </Typography>
              <Typography variant="h6" className="!tw-font-semibold !tw-text-blue-gray-900">
                {vendor.contactPerson ?? "Not provided"}
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {vendor.position ?? "—"}
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {vendor.phone ?? "No phone"}
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {vendor.email ?? "No email"}
              </Typography>
            </CardBody>
          </Card>
        </div>
        <Card className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
          <CardBody className="tw-grid tw-grid-cols-1 tw-gap-2 md:tw-grid-cols-2">
            <div>
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Address
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {vendor.address ?? "No address provided"}
              </Typography>
            </div>
            <div>
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Website
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {vendor.website ?? "—"}
              </Typography>
            </div>
            <div>
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                CR / VAT
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                CR: {vendor.cr ?? "—"} (exp {vendor.crExpiry ? new Date(vendor.crExpiry).toLocaleDateString() : "—"})
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                VAT: {vendor.vat ?? "—"} (exp {vendor.vatExpiry ? new Date(vendor.vatExpiry).toLocaleDateString() : "—"})
              </Typography>
            </div>
            <div>
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                Bank Details
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                Bank: {vendor.bank ?? "—"}
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                IBAN: {vendor.iban ?? "—"}
              </Typography>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

  const performanceContent = () => {
    const cards = [
      { label: "Orders", value: stats.totalOrders.toString() },
      { label: "Spend (SAR)", value: sar(stats.spend) },
      { label: "On-time %", value: `${stats.onTimePct.toFixed(2)}%` },
      { label: "Avg Lead Days", value: stats.avgLeadDays.toFixed(2) },
    ];

    return (
      <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
        {cards.map((card) => (
          <Card key={card.label} className="tw-border tw-border-blue-gray-100 tw-shadow-sm">
            <CardBody className="tw-space-y-1">
              <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                {card.label}
              </Typography>
              <Typography variant="h5" className="!tw-font-semibold !tw-text-blue-gray-900">
                {card.value}
              </Typography>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  };

  const invoicesContent = () => {
    if (invoices.isLoading) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          Loading invoice data…
        </Typography>
      );
    }

    if (invoices.isError || !invoices.data) {
      return (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          No invoice data available.
        </Typography>
      );
    }

    const buckets = invoices.data.buckets;
    const hasAging = Object.values(buckets).some((value) => value > 0);

    return (
      <div className="tw-space-y-4">
        {chartState !== "ready" ? (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            Charts require ResizeObserver support.
          </Typography>
        ) : hasAging ? (
          <VerticalBarChart
            height={260}
            series={[
              {
                name: "Outstanding",
                data: [buckets["0-30"], buckets["31-60"], buckets["61-90"], buckets["90+"]],
              },
            ]}
            options={{ xaxis: { categories: ["0-30", "31-60", "61-90", "90+"] } }}
            colors={["#2563eb"]}
          />
        ) : (
          <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
            No aging information available.
          </Typography>
        )}

        <div className="tw-overflow-x-auto">
          <table className="tw-min-w-full tw-table-auto">
            <thead>
              <tr className="tw-border-b tw-border-blue-gray-50">
                {[
                  "Invoice",
                  "Due",
                  "Outstanding",
                  "Status",
                ].map((header) => (
                  <th key={header} className="tw-px-3 tw-py-2 tw-text-left">
                    <Typography variant="small" className="!tw-font-semibold !tw-text-blue-gray-500">
                      {header}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.data.list.slice(0, 5).map((invoice) => (
                <tr key={invoice.id} className="tw-border-b tw-border-blue-gray-50 last:tw-border-0">
                  <td className="tw-px-3 tw-py-2">
                    <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                      {invoice.number}
                    </Typography>
                  </td>
                  <td className="tw-px-3 tw-py-2">
                    <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </Typography>
                  </td>
                  <td className="tw-px-3 tw-py-2">
                    <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                      {sar(invoice.outstanding)}
                    </Typography>
                  </td>
                  <td className="tw-px-3 tw-py-2">
                    <Chip
                      value={invoice.status}
                      color={invoice.outstanding > 0 ? "amber" : "green"}
                      variant="ghost"
                      className="tw-uppercase"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const documentsContent = () => (
    <div className="tw-space-y-4">
      <Button color="blue" variant="outlined" onClick={() => setDocumentModal(true)}>
        Upload Document
      </Button>
      {documents.length === 0 ? (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          No documents added in this drawer yet.
        </Typography>
      ) : (
        <ul className="tw-space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="tw-rounded-lg tw-border tw-border-blue-gray-100 tw-bg-blue-gray-50 tw-p-3">
              <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                {document.name}
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
                {document.type} • {document.uploadedAt.toLocaleDateString()}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const notesContent = () => (
    <div className="tw-space-y-4">
      <Textarea
        label="Add a note"
        value={noteDraft}
        onChange={(event) => setNoteDraft(event.target.value)}
      />
      <div className="tw-flex tw-justify-end">
        <Button color="blue" onClick={handleAddNote} disabled={!noteDraft.trim()}>
          Save Note
        </Button>
      </div>
      {notes.length === 0 ? (
        <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
          No notes captured yet.
        </Typography>
      ) : (
        <ul className="tw-space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-3">
              <Typography variant="small" className="!tw-font-medium !tw-text-blue-gray-700">
                {note.text}
              </Typography>
              <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-400">
                {note.createdAt.toLocaleString()}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <Drawer open={open} onClose={handleClose} placement="right" className="tw-w-full tw-max-w-3xl">
        <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-blue-gray-100 tw-p-4">
          <div>
            <Typography variant="h6" color="blue-gray">
              {vendor?.nameEn ?? "Vendor profile"}
            </Typography>
            <Typography variant="small" className="!tw-font-normal !tw-text-blue-gray-500">
              Detailed vendor insights
            </Typography>
          </div>
          <IconButton variant="text" color="blue-gray" onClick={handleClose}>
            <XMarkIcon className="tw-h-5 tw-w-5" />
          </IconButton>
        </div>

        <div className="tw-flex tw-flex-col tw-gap-4 tw-overflow-y-auto tw-p-4">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
            <Button color="blue" onClick={() => vendor && setFollowupModal(true)} disabled={!vendor}>
              Add Follow-up
            </Button>
            <Button
              color="gray"
              variant="outlined"
              onClick={() => setDocumentModal(true)}
              disabled={!vendor}
            >
              Upload Document
            </Button>
          </div>

          <Tabs value={activeTab} className="tw-space-y-4">
            <TabsHeader>
              {TABS.map((item) => (
                <Tab key={item} value={item} onClick={() => setActiveTab(item)}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Tab>
              ))}
            </TabsHeader>
            <TabsBody>
              <TabPanel value="overview">{overviewContent()}</TabPanel>
              <TabPanel value="performance">{performanceContent()}</TabPanel>
              <TabPanel value="invoices">{invoicesContent()}</TabPanel>
              <TabPanel value="documents">{documentsContent()}</TabPanel>
              <TabPanel value="notes">{notesContent()}</TabPanel>
            </TabsBody>
          </Tabs>
        </div>
      </Drawer>

      <Dialog open={documentModal} handler={() => setDocumentModal(false)}>
        <DialogHeader>Upload document</DialogHeader>
        <form onSubmit={handleDocumentSubmit}>
          <DialogBody className="tw-space-y-4">
            {documentError ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {documentError}
              </Typography>
            ) : null}
            <Input
              label="Document name"
              value={documentForm.name}
              crossOrigin="anonymous"
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              label="Document type"
              value={documentForm.type}
              crossOrigin="anonymous"
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, type: event.target.value }))}
              required
            />
          </DialogBody>
          <DialogFooter className="tw-space-x-2">
            <Button variant="text" color="gray" onClick={() => setDocumentModal(false)}>
              Cancel
            </Button>
            <Button color="blue" type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={followupModal} handler={() => setFollowupModal(false)}>
        <DialogHeader>Add follow-up</DialogHeader>
        <form onSubmit={handleFollowupSubmit}>
          <DialogBody className="tw-space-y-4">
            {followupError ? (
              <Typography variant="small" className="!tw-font-normal !tw-text-red-500">
                {followupError}
              </Typography>
            ) : null}
            <Input
              label="Title"
              value={followupForm.title}
              crossOrigin="anonymous"
              onChange={(event) => setFollowupForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <Input
              type="date"
              label="Due date"
              value={followupForm.dueAt}
              crossOrigin="anonymous"
              onChange={(event) => setFollowupForm((prev) => ({ ...prev, dueAt: event.target.value }))}
              required
            />
            <Textarea
              label="Notes"
              value={followupForm.notes}
              onChange={(event) => setFollowupForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </DialogBody>
          <DialogFooter className="tw-space-x-2">
            <Button variant="text" color="gray" onClick={() => setFollowupModal(false)}>
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
