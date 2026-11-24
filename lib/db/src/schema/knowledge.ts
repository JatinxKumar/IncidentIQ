import { index, pgTable, text, timestamp, uuid, varchar, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

// Knowledge document table
export const knowledgeDocumentsTable = pgTable('knowledge_documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title'),
    filePath: text('file_path').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('knowledge_documents_user_id_idx').on(table.userId),
]);

// Knowledge chunk table
export const knowledgeChunksTable = pgTable('knowledge_chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    chunkText: text('chunk_text').notNull(),
    embedding: text('embedding').notNull(), // JSON array of floats stored as text
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('knowledge_chunks_document_id_idx').on(table.documentId),
    index('knowledge_chunks_document_index').on(table.documentId, table.chunkIndex),
]);

// Link incident to knowledge chunk (many-to-many)
export const incidentKnowledgeLinks = pgTable('incident_knowledge_links', {
    id: uuid('id').primaryKey().defaultRandom(),
    incidentId: uuid('incident_id').notNull(),
    chunkId: uuid('chunk_id').notNull(),
}, (table) => [
    index('incident_knowledge_links_incident_id_idx').on(table.incidentId),
    index('incident_knowledge_links_chunk_id_idx').on(table.chunkId),
]);

export const selectKnowledgeDocumentSchema = createSelectSchema(knowledgeDocumentsTable);
export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocumentsTable, {
    userId: z.string().uuid(),
    title: z.string().min(1),
    filePath: z.string().min(1),
});
export const selectKnowledgeChunkSchema = createSelectSchema(knowledgeChunksTable);
export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunksTable, {
    documentId: z.string().uuid(),
    chunkIndex: z.number().int(),
    chunkText: z.string().min(1),
    embedding: z.string().min(1), // JSON array stored as text
});
export const insertIncidentKnowledgeLinkSchema = createInsertSchema(incidentKnowledgeLinks, {
    incidentId: z.string().uuid(),
    chunkId: z.string().uuid(),
});

export type KnowledgeDocument = typeof knowledgeDocumentsTable.$inferSelect;
export type InsertKnowledgeDocument = typeof knowledgeDocumentsTable.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunksTable.$inferSelect;
export type InsertKnowledgeChunk = typeof knowledgeChunksTable.$inferInsert;
export type IncidentKnowledgeLink = typeof incidentKnowledgeLinks.$inferSelect;
export type InsertIncidentKnowledgeLink = typeof incidentKnowledgeLinks.$inferInsert;