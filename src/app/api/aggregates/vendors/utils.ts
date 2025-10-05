import { Prisma } from "@prisma/client";

export const CURRENCY = "SAR";

export function decimalToNumber(value?: Prisma.Decimal | null, fractionDigits = 4) {
  return value ? Number(value.toFixed(fractionDigits)) : 0;
}

export function orderStatusesBuckets(status: string) {
  if (status === "CANCELLED") {
    return "Cancelled" as const;
  }

  if (status === "RECEIVED" || status === "CLOSED") {
    return "Closed" as const;
  }

  return "Open" as const;
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
