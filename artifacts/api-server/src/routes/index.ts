import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import incidentsRouter from "./incidents.js";
import dashboardRouter from "./dashboard.js";
import telemetryRouter from "./telemetry.js";
import githubWebhookRouter from "./githubWebhook.js";
import repositoriesRouter from "./repositories.js";
import reportsRouter from "./reports.js";
import knowledgeRouter from "./knowledge.js";
import anomaliesRouter from "./anomalies.js";
import vercelRouter from "./vercel.js";

const router: IRouter = Router();

router.use("/auth", authRouter);
router.use("/incidents", incidentsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/telemetry", telemetryRouter);
router.use("/github-webhooks", githubWebhookRouter);
router.use("/repositories", repositoriesRouter);
router.use("/integrations/vercel", vercelRouter);
router.use("/reports", reportsRouter);
router.use("/knowledge", knowledgeRouter);
router.use("/anomalies", anomaliesRouter);
router.use(healthRouter);

export default router;
