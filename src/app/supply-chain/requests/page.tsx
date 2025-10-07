import { Suspense } from "react";

import RequestsPageClient from "./RequestsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <RequestsPageClient />
    </Suspense>
  );
}
