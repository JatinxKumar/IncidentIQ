import { Request, Response } from 'express';
import { db } from '@workspace/db';
import { knowledgeChunksTable, knowledgeDocumentsTable } from '@workspace/db/schema/knowledge';
import { eq } from 'drizzle-orm';

/**
 * Simple embedding function using a local model placeholder.
 * In a real implementation, this would use a local embedding model like:
 * - @xenova/transformers for text embeddings
 * - sentence-transformers for semantic embeddings
 * - or any other local embedding solution
 */
async function generateEmbedding(text: string): Promise<number[]> {
    // For now, return a simple hash-based embedding
    // This is a placeholder - replace with actual local embedding model
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert hash to embedding vector (128 dimensions for simplicity)
    const embedding = new Array(128);
    for (let i = 0; i < 128; i++) {
        embedding[i] = hashArray[i % hashArray.length] / 255 - 0.5; // Normalize to [-0.5, 0.5]
    }

    return embedding;
}

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Search for similar chunks using vector similarity.
 */
export const searchSimilarChunks = async (req: Request, res: Response) => {
    try {
        const { query, userId, limit = 5, threshold = 0.7 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Get user's document IDs
        const userDocuments = await db
            .select({ id: knowledgeDocumentsTable.id })
            .from(knowledgeDocumentsTable)
            .where(eq(knowledgeDocumentsTable.userId, userId));

        const documentIds = userDocuments.map(doc => doc.id);

        if (documentIds.length === 0) {
            return res.json([]);
        }

        // Get all chunks for user's documents
        const allChunks = await db
            .select({
                id: knowledgeChunksTable.id,
                documentId: knowledgeChunksTable.documentId,
                chunkText: knowledgeChunksTable.chunkText,
                embedding: knowledgeChunksTable.embedding,
            })
            .from(knowledgeChunksTable)
            .where(eq(knowledgeChunksTable.documentId, documentIds));

        // Calculate similarity scores
        const chunksWithScores = await Promise.all(
            allChunks.map(async (chunk) => {
                const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
                const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

                return {
                    ...chunk,
                    similarity,
                };
            })
        );

        // Filter by threshold and sort by similarity
        const filteredChunks = chunksWithScores
            .filter(chunk => chunk.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        // Get document titles for enriched results
        const enrichedChunks = await Promise.all(
            filteredChunks.map(async (chunk) => {
                const document = await db
                    .select({ title: knowledgeDocumentsTable.title })
                    .from(knowledgeDocumentsTable)
                    .where(eq(knowledgeDocumentsTable.id, chunk.documentId))
                    .limit(1);

                return {
                    id: chunk.id,
                    documentId: chunk.documentId,
                    chunkText: chunk.chunkText,
                    similarity: chunk.similarity,
                    documentTitle: document[0]?.title || 'Unknown',
                };
            })
        );

        return res.json(enrichedChunks);
    } catch (error) {
        console.error('Error searching similar chunks:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all documents for a user.
 */
export const getUserDocuments = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        const documents = await db
            .select({
                id: knowledgeDocumentsTable.id,
                title: knowledgeDocumentsTable.title,
                filePath: knowledgeDocumentsTable.filePath,
                uploadedAt: knowledgeDocumentsTable.uploadedAt,
            })
            .from(knowledgeDocumentsTable)
            .where(eq(knowledgeDocumentsTable.userId, userId))
            .orderBy(knowledgeDocumentsTable.uploadedAt.desc());

        return res.json(documents);
    } catch (error) {
        console.error('Error getting user documents:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get chunks for a specific document.
 */
export const getDocumentChunks = async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        // Verify document belongs to user
        const document = await db
            .select()
            .from(knowledgeDocumentsTable)
            .where(eq(knowledgeDocumentsTable.id, documentId))
            .limit(1);

        if (document.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Get all chunks for the document
        const chunks = await db
            .select({
                id: knowledgeChunksTable.id,
                chunkIndex: knowledgeChunksTable.chunkIndex,
                chunkText: knowledgeChunksTable.chunkText,
                embedding: knowledgeChunksTable.embedding,
            })
            .from(knowledgeChunksTable)
            .where(eq(knowledgeChunksTable.documentId, documentId))
            .orderBy(knowledgeChunksTable.chunkIndex);

        return res.json(chunks);
    } catch (error) {
        console.error('Error getting document chunks:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};