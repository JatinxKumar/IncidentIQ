import { Request, Response } from 'express';
import { db } from '@workspace/db';
import {
   knowledgeDocumentsTable,
   knowledgeChunksTable,
   incidentKnowledgeLinks,
   insertKnowledgeDocumentSchema,
   insertKnowledgeChunkSchema,
   insertIncidentKnowledgeLinkSchema
} from '@workspace/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

// Simple in-memory placeholder for file processing (will be replaced with actual processing)
async function processFileContent(content: string, mimeType: string): Promise<string> {
  // For now, just return the content as plain text
  // In a real implementation, we would extract text based on mimeType
  return content;
}

// Simple embedding generator (returns a JSON string of random floats)
function generateEmbedding(): string {
  const embedding = Array.from({ length: 128 }, () => Math.random());
  return JSON.stringify(embedding);
}

/**
 * Upload and process a knowledge document.
 * Expects: { fileName: string, fileData: string (base64), mimeType: string, userId: string }
 */
export const uploadKnowledgeDocument = async (req: Request, res: Response) => {
  try {
    const { fileName, fileData, mimeType, userId } = req.body;

    if (!fileName || !fileData || !mimeType || !userId) {
      return res.status(400).json({ error: 'Missing required fields: fileName, fileData, mimeType, userId' });
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Process file content based on MIME type
    const text = await processFileContent(fileBuffer.toString('utf-8'), mimeType);

    // Insert document record
    const docResult = await db.insert(knowledgeDocumentsTable)
      .values({
        userId,
        title: fileName,
        filePath: `/uploads/${fileName}`,
      })
      .returning();

    const document = docResult[0];

    // Simple chunking (split into 500-character chunks with overlap)
    const chunkSize = 500;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunkText = text.substring(i, i + chunkSize);
      chunks.push({ text: chunkText, index: chunks.length });
    }

    // Store each chunk with embedding
    const chunkPromises = chunks.map(async (chunk, index) => {
      const embedding = generateEmbedding();
      const chunkResult = await db.insert(knowledgeChunksTable)
        .values({
          documentId: document.id,
          chunkIndex: index,
          chunkText: chunk.text,
          embedding,
        })
        .returning();
      return chunkResult[0];
    });

    const storedChunks = await Promise.all(chunkPromises);

    return res.status(201).json({
      document,
      chunks: storedChunks,
    });
  } catch (error) {
    console.error('Error uploading knowledge document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * List knowledge documents for a user.
 */
export const listKnowledgeDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const documents = await db.select()
      .from(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.userId, userId))
      .orderBy(desc(knowledgeDocumentsTable.uploadedAt));

    return res.json(documents);
  } catch (error) {
    console.error('Error listing knowledge documents:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Search for relevant knowledge chunks given a query text.
 */
export const searchKnowledge = async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    // Get user's document IDs
    const userDocuments = await db.select({ id: knowledgeDocumentsTable.id })
      .from(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.userId, userId));

    const documentIds = userDocuments.map(doc => doc.id);
    if (documentIds.length === 0) {
      return res.json([]);
    }

    // Fetch all chunks for these documents
    const allChunks = await db.select()
      .from(knowledgeChunksTable)
      .where(eq(knowledgeChunksTable.documentId, documentIds));

    // Simple text search (case-insensitive)
    const lowerQuery = query.toLowerCase();
    const matchingChunks = allChunks.filter(chunk =>
      chunk.chunkText.toLowerCase().includes(lowerQuery)
    );

    // Limit results
    const limitedChunks = matchingChunks.slice(0, parseInt(limit as string, 10));

    // Enrich with document titles
    const results = await Promise.all(
      limitedChunks.map(async chunk => {
        const document = await db.select({ title: knowledgeDocumentsTable.title })
          .from(knowledgeDocumentsTable)
          .where(eq(knowledgeDocumentsTable.id, chunk.documentId))
          .limit(1);
        return {
          ...chunk,
          documentTitle: document[0]?.title || 'Unknown',
        };
      })
    );

    return res.json(results);
  } catch (error) {
    console.error('Error searching knowledge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Link a knowledge chunk to an incident.
 */
export const linkKnowledgeToIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId, chunkId } = req.body;
    if (!incidentId || !chunkId) {
      return res.status(400).json({ error: 'incidentId and chunkId are required' });
    }

    const result = await db.insert(incidentKnowledgeLinks)
      .values({
        incidentId,
        chunkId,
      })
      .returning();

    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error linking knowledge to incident:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get knowledge chunks linked to an incident.
 */
export const getKnowledgeForIncident = async (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id;
    if (!incidentId) {
      return res.status(400).json({ error: 'Incident ID is required' });
    }

    const links = await db.select({
      chunkId: incidentKnowledgeLinks.chunkId,
      chunkText: knowledgeChunksTable.chunkText,
      embedding: knowledgeChunksTable.embedding,
      documentId: knowledgeChunksTable.documentId,
      documentTitle: knowledgeDocumentsTable.title,
    })
      .from(incidentKnowledgeLinks)
      .innerJoin(knowledgeChunksTable, eq(incidentKnowledgeLinks.chunkId, knowledgeChunksTable.id))
      .innerJoin(knowledgeDocumentsTable, eq(knowledgeChunksTable.documentId, knowledgeDocumentsTable.id))
      .where(eq(incidentKnowledgeLinks.incidentId, incidentId));

    return res.json(links);
  } catch (error) {
    console.error('Error getting knowledge for incident:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};