/**
 * schema/users.ts — Users Table
 * ================================
 * Stores authenticated users of the IncidentIQ platform.
 *
 * Relationships (outbound):
 *   none — users is the root entity; all other tables reference it
 *
 * Relationships (inbound):
 *   uploaded_logs.user_id     → users.id
 *   incidents.created_by      → users.id
 *   incidents.assigned_to     → users.id
 *   ml_models.trained_by      → users.id
 *   reports.generated_by      → users.id
 *   audit_logs.user_id        → users.id
 */

import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { userRoleEnum } from "./enums";

// ─── Table ─────────────────────────────────────────────────────────────────────

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    email: varchar("email", { length: 255 }).notNull().unique(),

    username: varchar("username", { length: 100 }).notNull().unique(),

    // Bcrypt hash — never store plaintext passwords
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    role: userRoleEnum("role").notNull().default("viewer"),

    isActive: boolean("is_active").notNull().default(true),

    // Null until first login; updated on every successful authentication
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // email and username already have implicit unique indexes from .unique()
    // Add explicit named indexes for query planner clarity
    index("users_email_idx").on(table.email),
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
    index("users_is_active_idx").on(table.isActive),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

/** Full row returned from SELECT */
export const selectUserSchema = createSelectSchema(usersTable).omit({
  passwordHash: true, // Never expose the hash in query results
});

/** INSERT payload — all required fields, auto-fields omitted */
export const insertUserSchema = createInsertSchema(usersTable, {
  email: z.email(),
  username: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens"),
  passwordHash: z.string().min(60), // bcrypt hash is always 60 chars
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type SafeUser = Omit<User, "passwordHash">;
