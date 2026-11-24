import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Migration: add `user_integrations` and `webhook_deliveries` tables.
 * Uses the project's existing Drizzle migration runner (scripts/init-schema.cjs etc.).
 */
export async function up(db: PgDatabase<any>) {
  // 1️⃣ user_integrations
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'github',
      provider_account_id VARCHAR(255) NOT NULL,
      username VARCHAR(255),
      encrypted_token TEXT NOT NULL,
      scopes VARCHAR(512),
      status VARCHAR(20) NOT NULL DEFAULT 'connected',
      last_validated_at TIMESTAMPTZ,
      encryption_key_version VARCHAR(10) NOT NULL DEFAULT '1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT user_provider_uc UNIQUE (user_id, provider)
    );
  `);

  // 2️⃣ webhook_deliveries
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'github',
      delivery_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'processed',
      processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT provider_delivery_uc UNIQUE (provider, delivery_id)
    );
  `);
}

export async function down(db: PgDatabase<any>) {
  await db.run(sql`DROP TABLE IF EXISTS webhook_deliveries;`);
  await db.run(sql`DROP TABLE IF EXISTS user_integrations;`);
}

