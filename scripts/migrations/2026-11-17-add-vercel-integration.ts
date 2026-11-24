import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Migration: Add Vercel integration support:
 * - user_integrations: encrypted_refresh_token, token_expires_at, metadata
 * - repositories: vercel_project_id, vercel_project_name, vercel_deployment_url, vercel_linked_at
 */
export async function up(db: PgDatabase<any>) {
  await db.run(sql`
    ALTER TABLE user_integrations 
    ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB;
  `);

  await db.run(sql`
    ALTER TABLE repositories 
    ADD COLUMN IF NOT EXISTS vercel_project_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS vercel_project_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT,
    ADD COLUMN IF NOT EXISTS vercel_linked_at TIMESTAMPTZ;
  `);
}

export async function down(db: PgDatabase<any>) {
  await db.run(sql`
    ALTER TABLE repositories
    DROP COLUMN IF EXISTS vercel_project_id,
    DROP COLUMN IF EXISTS vercel_project_name,
    DROP COLUMN IF EXISTS vercel_deployment_url,
    DROP COLUMN IF EXISTS vercel_linked_at;
  `);

  await db.run(sql`
    ALTER TABLE user_integrations
    DROP COLUMN IF EXISTS encrypted_refresh_token,
    DROP COLUMN IF EXISTS token_expires_at,
    DROP COLUMN IF EXISTS metadata;
  `);
}

