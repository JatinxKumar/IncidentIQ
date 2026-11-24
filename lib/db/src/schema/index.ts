/**
 * schema/index.ts — Schema Barrel Export
 * =========================================
 * Re-exports everything from every table module.
 * Import from "@workspace/db/schema" or "@workspace/db" to access tables,
 * Zod schemas, and TypeScript types.
 *
 * Table dependency order (outermost → innermost):
 *   enums            — no dependencies
 *   users            — no table dependencies
 *   uploaded_logs    → users
 *   ml_models        → users
 *   incidents        → users, uploaded_logs
 *   predictions      → incidents, uploaded_logs, ml_models
 *   reports          → users, incidents
 *   audit_logs       → users
 *
 * Usage:
 *   import { usersTable, insertUserSchema, type User } from "@workspace/db/schema";
 *   import { db } from "@workspace/db";
 */

export * from "./enums.js";
export * from "./users.js";
export * from "./uploaded-logs.js";
export * from "./ml-models.js";
export * from "./incidents.js";
export * from "./telemetry.js";
export * from "./predictions.js";
export * from "./reports.js";
export * from "./audit-logs.js";
export * from "./user-integrations.js";
export * from "./webhook-deliveries.js";
export * from "./repositories.js";
export * from "./knowledge.js";
