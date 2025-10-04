"use client";

export default function Requestshero() {
  return (
    <section className="tw-relative tw-w-full tw-overflow-hidden tw-rounded-xl">
      <img
        src="/img/requests/hero.jpeg"
        alt="Requests background"
        className="tw-h-[260px] tw-w-full tw-object-cover"
        aria-hidden="true"
      />
      <div className="tw-absolute tw-inset-0 tw-bg-black/30" />
      <div className="tw-absolute tw-inset-0 tw-flex tw-flex-col tw-justify-center tw-px-8 tw-text-white">
        <h1 className="tw-mb-2 tw-text-3xl tw-font-bold">Requests Overview</h1>
        <p className="tw-text-lg tw-opacity-90">Live trend &amp; operational focus</p>
      </div>
    </section>
  );
}
