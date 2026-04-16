import { Router } from "express";
import { db, projectsTable, assetValidationsTable } from "@workspace/db";
import { eq, and, count, sum, avg, sql } from "drizzle-orm";
import { CreateProjectBody, GetProjectParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// router.get("/projects", requireAuth, async (req, res): Promise<void> => {
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.userId;
  const role = req.auth!.role;

  const projects = role === "admin"
    ? await db.select().from(projectsTable).orderBy(projectsTable.createdAt)
    : await db.select().from(projectsTable).where(eq(projectsTable.userId, userId)).orderBy(projectsTable.createdAt);

  res.json(projects);
});

// router.post("/projects", requireAuth, async (req, res): Promise<void> => {
router.post("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({ 
      name: parsed.data.name, 
      type: parsed.data.type, 
      storageFolderLink: parsed.data.storageFolderLink ?? null,
      userId: req.auth!.userId 
    })
    .returning();
  res.status(201).json(project);
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Compute stats in a single query
  const [stats] = await db
    .select({
      totalAssets: count(assetValidationsTable.id),
      totalTokens: sum(assetValidationsTable.tokensUsed),
      totalCost: sum(assetValidationsTable.cost),
      avgLatency: avg(assetValidationsTable.latency),
      passCount: sql<number>`count(*) filter (where ${assetValidationsTable.validationResult} = 'PASS')`,
      failCount: sql<number>`count(*) filter (where ${assetValidationsTable.validationResult} = 'FAIL')`,
      duplicateCount: sql<number>`count(*) filter (where (${assetValidationsTable.preCheckResults}->>'isDuplicate')::boolean = true)`,
    })
    .from(assetValidationsTable)
    .where(eq(assetValidationsTable.projectId, params.data.id));

  const totalAssets = Number(stats?.totalAssets ?? 0);
  const passCount = Number(stats?.passCount ?? 0);
  const failCount = Number(stats?.failCount ?? 0);
  const duplicateCount = Number(stats?.duplicateCount ?? 0);
  const passPercent = totalAssets > 0 ? Math.round((passCount / totalAssets) * 100 * 10) / 10 : 0;

  res.json({
    ...project,
    totalAssets,
    validatedAssets: totalAssets,
    passCount,
    failCount,
    duplicateCount,
    passPercent,
    totalTokens: Number(stats?.totalTokens ?? 0),
    totalCost: Math.round(Number(stats?.totalCost ?? 0) * 1_000_000) / 1_000_000,
    avgLatency: Math.round(Number(stats?.avgLatency ?? 0)),
  });
});

export default router;
