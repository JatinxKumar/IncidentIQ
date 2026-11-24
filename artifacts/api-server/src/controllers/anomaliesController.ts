import { Request, Response } from 'express';
import { db } from '@workspace/db';
import { incidentsTable } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const getAnomalies = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        // Get incidents with anomaly status for the user
        const anomalies = await db
            .select()
            .from(incidentsTable)
            .where(
                and(
                    eq(incidentsTable.createdBy, userId),
                    eq(incidentsTable.severity, 'critical')  // Assuming critical severity indicates anomaly
                )
            )
            .orderBy(desc(incidentsTable.createdAt));

        return res.json(anomalies);
    } catch (error) {
        console.error('Error fetching anomalies:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};