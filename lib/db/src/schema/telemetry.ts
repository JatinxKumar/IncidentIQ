import { pgTable, serial, uuid, integer, numeric, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';
import { repositoriesTable } from './repositories';

// Main telemetry table
export const telemetryTable = pgTable('telemetry', {
    id: serial('id').primaryKey(),
    repositoryId: uuid('repository_id').references(() => repositoriesTable.id),
    cpuUsage: numeric('cpu_usage', { precision: 5, scale: 2 }).notNull(),
    memoryUsage: numeric('memory_usage', { precision: 5, scale: 2 }).notNull(),
    diskUsage: numeric('disk_usage', { precision: 5, scale: 2 }).notNull(),
    networkLatency: numeric('network_latency', { precision: 10, scale: 2 }).notNull(),
    requestRate: numeric('request_rate', { precision: 10, scale: 2 }).notNull(),
    errorRate: numeric('error_rate', { precision: 5, scale: 2 }).notNull(),
    responseTime: numeric('response_time', { precision: 10, scale: 2 }).notNull(),
    httpStatus: integer('http_status').notNull(),
    serviceAvailability: numeric('service_availability', { precision: 5, scale: 2 }).notNull(),
    dbConnections: numeric('db_connections', { precision: 10, scale: 2 }).notNull(),
    queryLatency: numeric('query_latency', { precision: 10, scale: 2 }).notNull(),
    cacheHitRatio: numeric('cache_hit_ratio', { precision: 5, scale: 2 }).notNull(),
    restartCount: integer('restart_count').notNull(),
    deploymentIndicator: boolean('deployment_indicator').notNull(),
    telemetrySource: varchar('telemetry_source', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// Indexes for performance
export const telemetryIndexes = [
    { name: 'telemetry_repository_id_idx', columns: ['repositoryId'] },
    { name: 'telemetry_created_at_idx', columns: ['createdAt'] }
];
