import { Suspense } from "react";

import OrdersPageClient from "./OrdersPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <OrdersPageClient />
    </Suspense>
  );
}
