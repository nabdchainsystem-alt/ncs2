"use client";

import Image from "next/image";

export default function WarehouseHero() {
  return (
    <section className="tw-relative tw-h-[260px] tw-w-full tw-overflow-hidden tw-rounded-xl">
      <Image
        src="/img/warehouse/hero.jpeg"
        alt="Warehouse operations"
        fill
        priority
        sizes="(min-width: 1024px) 1000px, 100vw"
        className="tw-h-full tw-w-full tw-object-cover"
      />
      <div className="tw-absolute tw-inset-0 tw-bg-black/30" />
      <div className="tw-absolute tw-inset-0 tw-flex tw-flex-col tw-justify-center tw-px-8 tw-text-white">
        <h1 className="tw-mb-2 tw-text-3xl tw-font-bold">Warehouse Overview</h1>
        <p className="tw-text-lg tw-opacity-90">
          Capacity, utilization &amp; inventory health
        </p>
      </div>
    </section>
  );
}
