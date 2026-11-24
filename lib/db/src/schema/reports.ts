/**
 * schema/reports.ts — Reports Table
 * ====================================
 * Stores generated analytical reports. A report is a JSON payload
 * computed on demand and optionally exported to a PDF.
 *
 * Relationships (outbound):
 *   reports.generated_by → users.id      (required — who requested it)
 *   reports.incident_id  → incidents.id  (optional — incident-scoped reports)
 *
 * Reports are immutable after creation — no updatedAt.
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

import { reportTypeEnum } from "./enums";
import { incidentsTable } from "./incidents";
import { usersTable } from "./users";

// ─── Table ─────────────────────────────────────────────────────────────────────

export const reportsTable = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    title: varchar("title", { length: 255 }).notNull(),

    type: reportTypeEnum("type").notNull(),

    // FK: the user who generated the report
    generatedBy: uuid("generated_by")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    // FK: scopes the report to a specific incident (e.g. incident_summary type)
    // Null for platform-wide reports (model_performance, anomaly_trend, etc.)
    incidentId: uuid("incident_id").references(() => incidentsTable.id, {
      onDelete: "set null", // Report persists even if the linked incident is deleted
      onUpdate: "cascade",
    }),

    // The full report payload — structure varies by report type:
    //   incident_summary:  { incidentCount, bySeverity, byStatus, avgResolutionTime }
    //   model_performance: { perAlgorithm: { precision, recall, f1, accuracy } }
    //   anomaly_trend:     { timeline: [{ date, count, severity }] }
    //   audit_summary:     { topActions, topUsers, eventCount }
    content: jsonb("content").notNull(),

    // Null until user requests PDF export
    // Path in object storage, e.g. "reports/2026/07/uuid.pdf"
    filePath: text("file_path"),

    // Reports are append-only — no updatedAt
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_generated_by_idx").on(table.generatedBy),
    index("reports_incident_id_idx").on(table.incidentId),
    index("reports_type_idx").on(table.type),
    // Dashboard: recent reports list
    index("reports_created_at_idx").on(table.createdAt),
    // Filter reports by type within a time range
    index("reports_type_created_at_idx").on(table.type, table.createdAt),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const selectReportSchema = createSelectSchema(reportsTable);

export const insertReportSchema = createInsertSchema(reportsTable, {
  title: z.string().min(1).max(255),
  content: z.record(z.string(), z.unknown()),
}).omit({
  id: true,
  filePath: true,
  createdAt: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type Report = typeof reportsTable.$inferSelect;
export type InsertReport = typeof reportsTable.$inferInsert;
