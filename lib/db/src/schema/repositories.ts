import { index, pgTable, text, timestamp, uuid, varchar, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

// Define enum for repository status
export const repositoryStatusEnum = pgEnum('repository_status', ['connected', 'disconnected', 'error']);

// Define the repositories table schema
export const repositoriesTable = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  branch: text('branch').notNull().default('main'),
  status: repositoryStatusEnum('status').default('disconnected'),
  userId: uuid('user_id').notNull(),
  connectedAt: timestamp('connected_at', { withTimezone: true }), // nullable by default
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }), // nullable by default
  lastScan: timestamp('last_scan', { withTimezone: true }), // nullable by default
  incidentCount: integer('incident_count').default(0),
  monitoringEnabled: boolean('monitoring_enabled').default(false),
  language: text('language'), // nullable by default
  vercelProjectId: varchar('vercel_project_id', { length: 255 }),
  vercelProjectName: varchar('vercel_project_name', { length: 255 }),
  vercelDeploymentUrl: text('vercel_deployment_url'),
  vercelLinkedAt: timestamp('vercel_linked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('repositories_status_idx').on(table.status),
  index('repositories_user_id_idx').on(table.userId),
]);

// Zod schemas

export const selectRepositorySchema = createSelectSchema(repositoriesTable);

export const insertRepositorySchema = createInsertSchema(repositoriesTable, {
  url: z.string().url().min(1),
  userId: z.string().uuid()
});

export const updateRepositorySchema = insertRepositorySchema.partial().omit({
  createdAt: true
});

export type Repository = typeof repositoriesTable.$inferSelect;

export type InsertRepository = typeof repositoriesTable.$inferInsert;

export type UpdateRepository = z.infer<typeof updateRepositorySchema>;
