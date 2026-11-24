import { pgTable, uuid, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

/**
 * user_integrations — stores per‑user third‑party connection credentials (GitHub, Vercel, etc.).
 */
export const userIntegrationsTable = pgTable(
  "user_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
    provider: varchar("provider", { length: 30 }).notNull().default("github"),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }),
    encryptedToken: text("encrypted_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    scopes: varchar("scopes", { length: 512 }),
    status: varchar("status", { length: 20 }).notNull().default("connected"),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    encryptionKeyVersion: varchar("encryption_key_version", { length: 10 }).notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One integration per provider per user
    { name: "user_provider_uc", columns: [table.userId, table.provider] as const, unique: true },
  ]
);

export const selectUserIntegrationSchema = createSelectSchema(userIntegrationsTable);
export const insertUserIntegrationSchema = createInsertSchema(userIntegrationsTable, {
  provider: z.string().min(1).max(30),
  providerAccountId: z.string().min(1).max(255),
  encryptedToken: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type UserIntegration = typeof userIntegrationsTable.$inferSelect;
export type InsertUserIntegration = typeof userIntegrationsTable.$inferInsert;
