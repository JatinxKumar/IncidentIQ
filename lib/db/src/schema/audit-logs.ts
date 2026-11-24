/**
 * schema/audit-logs.ts — AuditLogs Table
 * =========================================
 * Immutable append-only event log for all user actions and system events.
 * Used for security auditing, compliance, and incident timeline reconstruction.
 *
 * Design rules:
 *   - NEVER UPDATE or DELETE rows in this table
 *   - system_user_id is NULL for automated/system-triggered events
 *   - entity_type + entity_id identify the affected record in any table
 *   - old_values / new_values store a JSON diff for mutations
 *
 * Relationships (outbound):
 *   audit_logs.user_id → users.id  (nullable — system events have no user)
 *
 * No updatedAt — audit logs are strictly append-only.
 *
 * Example action values:
 *   "user.login"         "user.logout"         "user.created"
 *   "incident.created"   "incident.assigned"   "incident.resolved"
 *   "model.training_started"  "model.activated"
 *   "log.uploaded"       "log.processed"       "log.failed"
 *   "report.generated"   "report.exported"
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

// ─── Table ─────────────────────────────────────────────────────────────────────

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK: the user who performed the action
    // NULL for automated system actions (e.g. ML pipeline events)
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null", // Retain audit trail even if user is deleted
      onUpdate: "cascade",
    }),

    // Dot-namespaced action identifier, e.g. "incident.resolved"
    // Namespace.verb convention: entity.action
    action: varchar("action", { length: 100 }).notNull(),

    // The type of entity that was acted upon, e.g. "incident", "ml_model"
    entityType: varchar("entity_type", { length: 100 }).notNull(),

    // The UUID of the affected row — NULL for non-entity events (e.g. user.login)
    entityId: uuid("entity_id"),

    // Snapshot of the record BEFORE the change (NULL for creates and reads)
    oldValues: jsonb("old_values"),

    // Snapshot of the record AFTER the change (NULL for deletes and reads)
    newValues: jsonb("new_values"),

    // Requesting client's IP address — varchar to support both IPv4 and IPv6
    ipAddress: varchar("ip_address", { length: 45 }),

    userAgent: text("user_agent"),

    // Audit logs are append-only — no updatedAt
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_action_idx").on(table.action),
    // Look up all events for a specific record: WHERE entity_type = ? AND entity_id = ?
    index("audit_logs_entity_type_entity_id_idx").on(
      table.entityType,
      table.entityId,
    ),
    // Time-range queries for audit reports
    index("audit_logs_created_at_idx").on(table.createdAt),
    // Per-user activity timeline
    index("audit_logs_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const selectAuditLogSchema = createSelectSchema(auditLogsTable);

export const insertAuditLogSchema = createInsertSchema(auditLogsTable, {
  action: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z_]+\.[a-z_]+$/, "Action must follow the 'entity.verb' convention"),
  entityType: z.string().min(1).max(100),
}).omit({
  id: true,
  createdAt: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
