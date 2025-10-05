"use client";

export default function VendorsHero() {
  return (
    <section className="tw-relative tw-w-full tw-overflow-hidden tw-rounded-xl">
      <img
        src="/img/vendors/hero.jpeg"
        alt="Vendors background"
        className="tw-h-[260px] tw-w-full tw-object-cover"
        aria-hidden="true"
      />
      <div className="tw-absolute tw-inset-0 tw-bg-black/40" />
      <div className="tw-absolute tw-inset-0 tw-flex tw-flex-col tw-justify-center tw-gap-2 tw-px-8 tw-text-white">
        <h1 className="tw-text-3xl tw-font-bold">Vendors Overview</h1>
        <p className="tw-text-lg tw-opacity-90">
          Sourcing performance &amp; relationship health
        </p>
      </div>
    </section>
  );
}
