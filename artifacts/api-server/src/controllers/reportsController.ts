import { Request, Response } from 'express';
import { db } from '@workspace/db';
import {
    incidentsTable,
    reportsTable,
} from '@workspace/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for report generation
const generateReportSchema = z.object({
    incidentIds: z.array(z.string()).optional(),
    timeRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }).optional(),
    reportType: z.enum(['summary', 'detailed', 'trend']).default('summary'),
});

export const listReports = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        const reports = await db
            .select()
            .from(reportsTable)
            .where(eq(reportsTable.generatedBy, userId))
            .orderBy(desc(reportsTable.createdAt));

        return res.json(reports);
    } catch (error) {
        console.error('Error listing reports:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const generateReport = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        const parseResult = generateReportSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: parseResult.error.errors
            });
        }

        const { incidentIds, timeRange, reportType } = parseResult.data;

        // For now, create a simple report record
        // In a real implementation, we would generate the report content based on the data
        const reportResult = await db.insert(reportsTable)
            .values({
                userId,
                title: `${reportType} report`,
                type: reportType,
                status: 'generated',
                // We'll store the parameters as a JSON string in a column or separate table
                // For simplicity, we'll just create a placeholder
                content: JSON.stringify({ incidentIds, timeRange, reportType }),
            })
            .returning();

        const report = reportResult[0];
        return res.status(201).json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getReportById = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }

        const reportId = req.params.id;
        if (!reportId) {
            return res.status(400).json({ error: 'Report ID is required' });
        }

        const report = await db
            .select()
            .from(reportsTable)
            .where(
                and(
                    eq(reportsTable.id, reportId),
                    eq(reportsTable.userId, userId)
                )
            )
            .limit(1);

        if (report.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        return res.json(report[0]);
    } catch (error) {
        console.error('Error getting report by ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};