import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = runtimeDatabaseUrl(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) return;
    await this.$connect();
  }

  async onModuleDestroy() {
    if (!process.env.DATABASE_URL) return;
    await this.$disconnect();
  }
}

function runtimeDatabaseUrl(value: string | undefined) {
  if (!value || !process.env.VERCEL) return value;

  const url = new URL(value);
  // Supabase transaction pooling requires prepared statements to be disabled for Prisma.
  if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  return url.toString();
}
