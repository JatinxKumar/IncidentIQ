/**
 * schema/enums.ts — PostgreSQL Enum Type Definitions
 * ====================================================
 * All pgEnum types used across the IncidentIQ schema.
 * Defined in a single file so every table imports from one place.
 *
 * Enums create native PostgreSQL enum types — validated at the DB level,
 * not only in application code. Changing an enum value requires a migration.
 *
 * Adding a value: safe (ALTER TYPE ... ADD VALUE)
 * Removing a value: destructive — requires a migration with data backfill
 */

import { pgEnum } from "drizzle-orm/pg-core";

// ─── Users ─────────────────────────────────────────────────────────────────────

/**
 * Role-based access control levels.
 *   admin   — full access: manage users, models, all incidents
 *   analyst — read/write incidents + predictions; cannot manage users
 *   viewer  — read-only across all tables
 */
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "analyst",
  "viewer",
]);

// ─── Uploaded Logs ─────────────────────────────────────────────────────────────

/**
 * Processing lifecycle for an uploaded log file.
 *   pending    — file uploaded, queued for preprocessing
 *   processing — ML pipeline is actively working on the file
 *   processed  — preprocessing + feature engineering complete
 *   failed     — pipeline encountered an unrecoverable error
 */
export const logStatusEnum = pgEnum("log_status", [
  "pending",
  "processing",
  "processed",
  "failed",
]);

// ─── Incidents ─────────────────────────────────────────────────────────────────

/**
 * Incident severity — affects alert routing and SLA timers.
 *   low      — informational; review at next business day
 *   medium   — degraded performance; review within 4 hours
 *   high     — service impacted; review within 1 hour
 *   critical — full outage; immediate response required
 */
export const incidentSeverityEnum = pgEnum("incident_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

/**
 * Incident lifecycle status.
 *   open          — detected but unassigned
 *   investigating — assigned engineer is actively working
 *   resolved      — root cause identified and fix applied
 *   closed        — verified resolved; post-mortem complete
 */
export const incidentStatusEnum = pgEnum("incident_status", [
  "open",
  "investigating",
  "resolved",
  "closed",
]);

/**
 * How the incident was created.
 *   manual      — created directly by a user
 *   ml_detected — triggered by the ensemble classifier exceeding threshold
 *   log_anomaly — triggered by anomaly score on an uploaded log
 */
export const incidentSourceEnum = pgEnum("incident_source", [
  "manual",
  "ml_detected",
  "log_anomaly",
  "github",
]);

// ─── ML Models & Predictions ───────────────────────────────────────────────────

/**
 * All ML algorithms supported by the IncidentIQ engine.
 *   decision_tree     — supervised, interpretable baseline
 *   random_forest     — supervised, high-accuracy ensemble of trees
 *   knn               — supervised, instance-based classification
 *   svm               — supervised, effective for high-dimensional data
 *   kmeans            — unsupervised, cluster-based anomaly detection
 *   linear_regression — baseline deviation detector
 *   ensemble          — weighted voting over all supervised classifiers
 */
export const algorithmEnum = pgEnum("algorithm", [
  "decision_tree",
  "random_forest",
  "knn",
  "svm",
  "kmeans",
  "linear_regression",
  "ensemble",
]);

/**
 * Training lifecycle for a model version.
 *   training   — training job is running
 *   trained    — training complete; not yet validated as active
 *   active     — currently serving predictions (max 1 per algorithm)
 *   archived   — superseded by a newer version; kept for audit
 *   failed     — training job failed; see error in audit logs
 */
export const modelStatusEnum = pgEnum("model_status", [
  "training",
  "trained",
  "active",
  "archived",
  "failed",
]);

// ─── Reports ──────────────────────────────────────────────────────────────────

/**
 * Categories of generated reports.
 *   incident_summary    — incident metrics for a time period
 *   model_performance   — precision, recall, F1 per algorithm
 *   anomaly_trend       — anomaly volume + severity over time
 *   audit_summary       — user activity and system events
 */
export const reportTypeEnum = pgEnum("report_type", [
  "incident_summary",
  "model_performance",
  "anomaly_trend",
  "audit_summary",
]);
