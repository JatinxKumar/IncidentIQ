/**
 * schema/ml-models.ts — MLModels Table
 * =======================================
 * Stores every trained model version for every algorithm.
 * Each row represents one model artifact (a .joblib file).
 *
 * Invariant enforced by partial unique index:
 *   At most one model per algorithm may have is_active = TRUE.
 *   Enforced by: ml_models_one_active_per_algorithm_idx
 *   Application must set the previous active model to 'archived'
 *   before activating a new one.
 *
 * Relationships (outbound):
 *   ml_models.trained_by → users.id
 *
 * Relationships (inbound):
 *   predictions.ml_model_id → ml_models.id
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { algorithmEnum, modelStatusEnum } from "./enums";
import { usersTable } from "./users";

// ─── Table ─────────────────────────────────────────────────────────────────────

export const mlModelsTable = pgTable(
  "ml_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Human-readable name, e.g. "Random Forest v3 — retrained July 2026"
    name: varchar("name", { length: 255 }).notNull(),

    algorithm: algorithmEnum("algorithm").notNull(),

    // Monotonically increasing per algorithm — managed by the training service
    version: integer("version").notNull().default(1),

    status: modelStatusEnum("status").notNull().default("training"),

    // Only one model per algorithm may be active at a time
    // Enforced by partial unique index below
    isActive: boolean("is_active").notNull().default(false),

    // JSON object — shape varies per algorithm
    // e.g. { "n_estimators": 100, "max_depth": 10 } for Random Forest
    hyperparameters: jsonb("hyperparameters").notNull(),

    // Populated after training completes
    // Shape: { accuracy, precision, recall, f1, auc_roc, confusionMatrix, cvScores }
    metrics: jsonb("metrics"),

    // FK: the user who triggered the training job
    trainedBy: uuid("trained_by")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    trainingStartedAt: timestamp("training_started_at", { withTimezone: true }),

    // Null until training finishes (success or failure)
    trainingCompletedAt: timestamp("training_completed_at", {
      withTimezone: true,
    }),

    // Path in object storage, e.g. "models/random_forest/v3.joblib"
    // Null while training is in progress
    modelFilePath: text("model_file_path"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ml_models_algorithm_status_idx").on(table.algorithm, table.status),
    index("ml_models_trained_by_idx").on(table.trainedBy),
    index("ml_models_is_active_idx").on(table.isActive),

    // Partial unique index: enforces the one-active-per-algorithm invariant
    // at the database level. PostgreSQL ignores rows where is_active = FALSE.
    uniqueIndex("ml_models_one_active_per_algorithm_idx")
      .on(table.algorithm)
      .where(sql`is_active = TRUE`),
  ],
);

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const selectMlModelSchema = createSelectSchema(mlModelsTable);

export const insertMlModelSchema = createInsertSchema(mlModelsTable, {
  name: z.string().min(1).max(255),
  version: z.number().int().positive(),
}).omit({
  id: true,
  isActive: true,
  metrics: true,
  trainingCompletedAt: true,
  modelFilePath: true,
  createdAt: true,
  updatedAt: true,
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type MlModel = typeof mlModelsTable.$inferSelect;
export type InsertMlModel = typeof mlModelsTable.$inferInsert;
