import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

import {
  incidentSeverityEnum,
  incidentSourceEnum,
  incidentStatusEnum,
} from './enums';
import { uploadedLogsTable } from './uploaded-logs';
import { usersTable } from './users';

// ─── Table ─────────────────────────────────────────────────────────────────────

export const incidentsTable = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    title: varchar('title', { length: 255 }).notNull(),

    description: text('description'),

    severity: incidentSeverityEnum('severity').notNull(),

    status: incidentStatusEnum('status').notNull().default('open'),

    source: incidentSourceEnum('source').notNull(),

    // FK: user who opened the incident (manually or via automation)
    createdBy: uuid('created_by')
      .notNull()
      .references(() => usersTable.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),

    // FK: currently assigned engineer (nullable — unassigned when first opened)
    assignedTo: uuid('assigned_to').references(() => usersTable.id, {
      onDelete: 'set null', // Assignment cleared if user is deleted
      onUpdate: 'cascade',
    }),

    // FK: the log file that triggered this incident (nullable for manual incidents)
    uploadedLogId: uuid('uploaded_log_id').references(
      () => uploadedLogsTable.id,
      {
        onDelete: 'set null', // Incident persists even if log is deleted
        onUpdate: 'cascade',
      }),

    // Populated by the Generative AI RCA module (Module 8)
    // Null until root cause analysis is complete
    rootCause: text('root_cause'),

    // Null until status transitions to 'resolved'
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('incidents_status_idx').on(table.status),
    index('incidents_severity_idx').on(table.severity),
    index('incidents_created_by_idx').on(table.createdBy),
    index('incidents_assigned_to_idx').on(table.assignedTo),
    index('incidents_uploaded_log_id_idx').on(table.uploadedLogId),
    // Dashboard query: open/investigating incidents by severity
    index('incidents_status_severity_idx').on(table.status, table.severity),
    // Time-range queries for trend analysis and reporting
    index('incidents_created_at_idx').on(table.createdAt),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const selectIncidentSchema = createSelectSchema(incidentsTable);

// Include resolvedAt in insert schema
export const insertIncidentSchema = createInsertSchema(incidentsTable, {
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  resolvedAt: z.date().optional(), // Add resolvedAt to insert schema
}).omit({
  id: true,
  rootCause: true,
  createdAt: true,
  updatedAt: true,
});

// Include resolvedAt in update schema
export const updateIncidentSchema = insertIncidentSchema.partial().omit({
  createdBy: true,
  source: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────
export type Incident = typeof incidentsTable.$inferSelect;
export type InsertIncident = typeof incidentsTable.$inferInsert;
export type UpdateIncident = z.infer<typeof updateIncidentSchema>;
