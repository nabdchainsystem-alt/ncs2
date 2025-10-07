"use client";

import { useSearchParams } from "next/navigation";

import RequestsPage from "./RequestsPage";

export default function RequestsPageClient() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";

  return <RequestsPage initialQuery={q} />;
}
