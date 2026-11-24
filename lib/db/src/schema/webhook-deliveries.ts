import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

/**
 * webhook_deliveries — persistent storage for processed GitHub webhook events.
 * Each delivery is uniquely identified per provider (GitHub) to allow idempotency.
 */
export const webhookDeliveriesTable = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null", onUpdate: "cascade" }),
    provider: varchar("provider", { length: 30 }).notNull().default("github"),
    deliveryId: varchar("delivery_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("processed"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Unique per provider (GitHub) to avoid duplicate deliveries
    { name: "provider_delivery_uc", columns: [table.provider, table.deliveryId] as const, unique: true },
    // Optional index for user‑specific timeline queries
    { name: "webhook_user_idx", columns: [table.userId] as const },
  ]
);

export const selectWebhookDeliverySchema = createSelectSchema(webhookDeliveriesTable);
export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveriesTable, {
  provider: z.string().min(1).max(30),
  deliveryId: z.string().min(1).max(255),
  eventType: z.string().min(1).max(100),
  payload: z.any(),
}).omit({ id: true, createdAt: true, processedAt: true });

export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveriesTable.$inferInsert;

