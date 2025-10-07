import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";

/** Postgres: check table existence in public schema */
export async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
    Prisma.sql`SELECT EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists;`
  );
  return !!rows?.[0]?.exists;
}
