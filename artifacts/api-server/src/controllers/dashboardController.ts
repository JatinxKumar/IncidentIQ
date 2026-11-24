import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { incidentsTable, reportsTable, repositoriesTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

export class DashboardController {
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // Get user's repositories
      const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
      const repoIds = userRepos.map(r => r.id);

      // Get incidents for user's repositories
      const userIncidents = await db.select().from(incidentsTable);
      const filteredIncidents = userIncidents.filter(inc =>
        inc.createdBy === userId || repoIds.includes(inc.createdBy)
      );

      const totalIncidents = filteredIncidents.length;
      const criticalIncidents = filteredIncidents.filter(i => i.severity === 'critical').length;
      const openIncidents = filteredIncidents.filter(i => i.status === 'open').length;
      const resolvedIncidents = filteredIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;

      // Calculate average resolution time (in hours)
      const resolvedWithTime = filteredIncidents.filter(i => i.resolvedAt && i.createdAt);
      const avgResolutionTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, i) => {
          const created = new Date(i.createdAt!).getTime();
          const resolved = new Date(i.resolvedAt!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0) / resolvedWithTime.length
        : 0;

      // Get recent incidents (last 5)
      const recentIncidents = filteredIncidents
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 5)
        .map(i => ({
          id: i.id,
          title: i.title,
          severity: i.severity,
          status: i.status,
          timestamp: i.createdAt,
        }));

      const metrics = {
        totalIncidents,
        criticalIncidents,
        openIncidents,
        resolvedIncidents,
        averageResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        recentIncidents,
        systemHealth: totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 100,
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getIncidents(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // Get user's repositories
      const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
      const repoIds = userRepos.map(r => r.id);

      // Get incidents for user's repositories
      const allIncidents = await db.select().from(incidentsTable);
      const filteredIncidents = allIncidents.filter(inc =>
        inc.createdBy === userId || repoIds.includes(inc.createdBy)
      );

      res.json(filteredIncidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getModels(req: Request, res: Response): Promise<void> {
    // Models data - could be extended to fetch from ml_models table
    const models = [
      { id: "1", name: "Incident Classifier", accuracy: 94.2, lastTrained: "2024-01-15" },
      { id: "2", name: "Anomaly Detector", accuracy: 91.8, lastTrained: "2024-01-10" },
    ];
    res.json(models);
  }

  static async getReports(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const reports = await db
        .select()
        .from(reportsTable)
        .where(eq(reportsTable.generatedBy, userId))
        .orderBy(desc(reportsTable.createdAt));

      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRepositories(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const repositories = await db
        .select()
        .from(repositoriesTable)
        .where(eq(repositoriesTable.userId, userId))
        .orderBy(desc(repositoriesTable.createdAt));

      res.json(repositories);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getKnowledge(req: Request, res: Response): Promise<void> {
    // Knowledge base data - could be extended to fetch from knowledge table
    const knowledge = [
      { id: "1", title: "Database Troubleshooting", content: "Common database issues and solutions...", lastUpdated: "2024-01-10" },
      { id: "2", title: "API Best Practices", content: "Guidelines for building robust APIs...", lastUpdated: "2024-01-08" },
    ];
    res.json(knowledge);
  }

  static async getSettings(req: Request, res: Response): Promise<void> {
    // Settings data - could be extended to fetch from user settings table
    const settings = {
      notifications: { email: true, slack: false, webhook: true },
      retentionDays: 30,
      alertThresholds: { cpu: 80, memory: 85, disk: 90 },
    };
    res.json(settings);
  }
}