/**
 * schema/uploaded-logs.ts — UploadedLogs Table
 * ===============================================
 * Tracks every log file uploaded by users for ML processing.
 * The preprocessing pipeline reads this table to pick up pending files,
 * updates status throughout the pipeline, and writes row_count on completion.
 *
 * Relationships (outbound):
 *   uploaded_logs.user_id → users.id   (who uploaded the file)
 *
 * Relationships (inbound):
 *   incidents.uploaded_log_id   → uploaded_logs.id
 *   predictions.uploaded_log_id → uploaded_logs.id
 */

import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { logStatusEnum } from "./enums";
import { usersTable } from "./users";

// ─── Table ─────────────────────────────────────────────────────────────────────

export const uploadedLogsTable = pgTable(
  "uploaded_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK: the user who performed the upload
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "restrict", // Cannot delete a user who has uploaded logs
        onUpdate: "cascade",
      }),

    // System-generated unique storage filename (e.g. UUID + extension)
    filename: varchar("filename", { length: 255 }).notNull(),

    // Original filename as provided by the user
    originalName: varchar("original_name", { length: 255 }).notNull(),

    // File size in bytes — used for quota enforcement
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),

    // e.g. "text/csv", "application/json"
    mimeType: varchar("mime_type", { length: 100 }).notNull(),

    // Path in object storage (e.g. "uploads/2026/07/uuid.csv")
    storagePath: text("storage_path").notNull(),

    status: logStatusEnum("status").notNull().default("pending"),

    // Populated after successful processing — number of log rows in the file
    rowCount: integer("row_count"),

    // Populated only on status = 'failed'
    errorMessage: text("error_message"),

    // Timestamp when pipeline completed (success or failure)
    processedAt: timestamp("processed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("uploaded_logs_user_id_idx").on(table.userId),
    index("uploaded_logs_status_idx").on(table.status),
    // Pipeline worker queries: WHERE status = 'pending' ORDER BY created_at
    index("uploaded_logs_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const selectUploadedLogSchema = createSelectSchema(uploadedLogsTable);

export const insertUploadedLogSchema = createInsertSchema(uploadedLogsTable, {
  filename: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
  storagePath: z.string().min(1),
}).omit({
  id: true,
  status: true,
  rowCount: true,
  errorMessage: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type UploadedLog = typeof uploadedLogsTable.$inferSelect;
export type InsertUploadedLog = typeof uploadedLogsTable.$inferInsert;
