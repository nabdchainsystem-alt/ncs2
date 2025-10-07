"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const OrdersPage = dynamic(() => import("./OrdersPage").then((m) => m.default ?? m), {
  ssr: false,
  loading: () => <div style={{ height: 24 }} />,
});

export default function OrdersPageClient(props: any) {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  void isBrowser;

  return (
    <Suspense fallback={<div />}>
      <OrdersPage {...props} />
    </Suspense>
  );
}
