export function utcStart(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n, 1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function isoDay(d: Date) {
  return utcStart(d).toISOString().slice(0, 10);
}

export type Bucket = "daily" | "weekly" | "monthly";

export function buildBoundaries(bucket: Bucket, span: number) {
  const today = utcStart(new Date());
  const bounds: { label: string; from: Date; to: Date }[] = [];

  if (bucket === "daily") {
    for (let i = span - 1; i >= 0; i -= 1) {
      const from = addDays(today, -i);
      const to = addDays(from, 1);
      bounds.push({ label: isoDay(from), from, to });
    }
  } else if (bucket === "weekly") {
    // Simple 7-day windows ending at today
    for (let i = span - 1; i >= 0; i -= 1) {
      const to = addDays(today, -i * 7);
      const from = addDays(to, -7);
      const label = `W-${span - i}`;
      bounds.push({ label, from, to });
    }
  } else {
    for (let i = span - 1; i >= 0; i -= 1) {
      const to = addMonths(today, -i);
      const from = addMonths(to, -1);
      const label = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`;
      bounds.push({ label, from, to });
    }
  }

  return bounds;
}
