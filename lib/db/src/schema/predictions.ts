/**
 * schema/predictions.ts — Predictions Table
 * ============================================
 * Records every ML inference event — one row per model scoring call.
 * The ensemble produces one row per algorithm + one row for the final
 * ensemble decision (algorithm = 'ensemble').
 *
 * Relationships (outbound):
 *   predictions.uploaded_log_id → uploaded_logs.id  (required — source data)
 *   predictions.ml_model_id     → ml_models.id      (required — model used)
 *   predictions.incident_id     → incidents.id      (optional — linked incident)
 *
 * No updatedAt: predictions are immutable once created.
 */

import {
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { algorithmEnum } from "./enums";
import { incidentsTable } from "./incidents";
import { mlModelsTable } from "./ml-models";
import { uploadedLogsTable } from "./uploaded-logs";

// ─── Table ─────────────────────────────────────────────────────────────────────

export const predictionsTable = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK: the incident this prediction triggered or was linked to
    // Null when the prediction did not cross the anomaly threshold
    incidentId: uuid("incident_id").references(() => incidentsTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    // FK: the log file whose features were scored
    uploadedLogId: uuid("uploaded_log_id")
      .notNull()
      .references(() => uploadedLogsTable.id, {
        onDelete: "cascade", // Predictions are meaningless without source data
        onUpdate: "cascade",
      }),

    // FK: the exact model version that produced this prediction
    mlModelId: uuid("ml_model_id")
      .notNull()
      .references(() => mlModelsTable.id, {
        onDelete: "restrict", // Preserve audit trail — never orphan a prediction
        onUpdate: "cascade",
      }),

    algorithm: algorithmEnum("algorithm").notNull(),

    // Human-readable class label, e.g. "anomaly", "normal", "critical"
    label: varchar("label", { length: 100 }).notNull(),

    // Model confidence in the predicted label — constrained [0.0000, 1.0000]
    // DB-level check constraint enforces this range
    confidenceScore: numeric("confidence_score", {
      precision: 5,
      scale: 4,
    }).notNull(),

    // Input feature vector as key-value pairs — stored for explainability
    featureVector: jsonb("feature_vector"),

    // Full model output — used for debugging and reproducibility
    rawOutput: jsonb("raw_output"),

    // Predictions are append-only — no updated_at
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Enforce 0 ≤ confidence_score ≤ 1 at the database level
    check(
      "predictions_confidence_score_range",
      sql`${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 1`,
    ),

    index("predictions_incident_id_idx").on(table.incidentId),
    index("predictions_uploaded_log_id_idx").on(table.uploadedLogId),
    index("predictions_ml_model_id_idx").on(table.mlModelId),
    index("predictions_algorithm_idx").on(table.algorithm),
    index("predictions_label_idx").on(table.label),
    // High-confidence anomaly dashboard: WHERE label = 'anomaly' ORDER BY confidence DESC
    index("predictions_label_confidence_idx").on(
      table.label,
      table.confidenceScore,
    ),
    index("predictions_created_at_idx").on(table.createdAt),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const selectPredictionSchema = createSelectSchema(predictionsTable);

export const insertPredictionSchema = createInsertSchema(predictionsTable, {
  label: z.string().min(1).max(100),
  confidenceScore: z.string().refine(
    (v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0 && n <= 1;
    },
    { message: "confidenceScore must be between 0 and 1" },
  ),
}).omit({
  id: true,
  createdAt: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type Prediction = typeof predictionsTable.$inferSelect;
export type InsertPrediction = typeof predictionsTable.$inferInsert;
