import { Router } from "express";
import { db, assetValidationsTable, projectsTable, projectConfigsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { ValidateAssetBody, ListValidationsQueryParams, GetValidationParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  detectPII,
  hashContent,
  checkDuplicate,
  detectBlur,
  runAIValidation,
} from "../services/validation";

const router = Router();

router.post("/validate", requireAuth, async (req, res): Promise<void> => {
  const parsed = ValidateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { projectId, assetName, assetContent, assetType, validationRules, promptOverride, model,
    enablePIICheck, enableBlurCheck, enableDuplicationCheck } = parsed.data;

  // Load project config for pre-check settings
  const [config] = await db
    .select()
    .from(projectConfigsTable)
    .where(eq(projectConfigsTable.projectId, projectId))
    .limit(1);

  // Per-request overrides take precedence over project config
  const enableDuplication = enableDuplicationCheck ?? config?.enableDuplicationCheck ?? false;
  const enablePII = enablePIICheck ?? config?.enablePIIValidation ?? false;
  const enableBlur = enableBlurCheck ?? config?.enableBlurCheck ?? false;

  // Step 1: Pre-checks
  const contentHash = hashContent(assetContent);

  const blurScore = enableBlur ? detectBlur(assetContent, assetType) : null;
  const isDuplicate = enableDuplication ? await checkDuplicate(projectId, contentHash) : false;
  const piiResult = enablePII ? detectPII(assetContent) : { detected: false, items: [] };

  const preCheckResults = {
    blurScore,
    isDuplicate,
    piiDetected: piiResult.detected,
    piiItems: piiResult.items,
  };

  // If duplicate, short-circuit
  let shortCircuitFail: string | null = null;
  if (isDuplicate) shortCircuitFail = "Duplicate asset detected";
  if (piiResult.detected) shortCircuitFail = shortCircuitFail ?? `PII detected: ${piiResult.items.join(", ")}`;

  const effectiveRules = validationRules ?? config?.validationRules ?? "";

  // Step 2: AI Validation
  const aiResult = await runAIValidation({
    projectId,
    assetContent,
    assetType,
    validationRules: effectiveRules,
    promptOverride: promptOverride ?? null,
    model: model ?? null,
  });

  // If pre-check failed, override result to FAIL
  const finalStatus = shortCircuitFail ? "FAIL" : aiResult.status;
  const finalReasons = shortCircuitFail
    ? [shortCircuitFail, ...aiResult.reasons]
    : aiResult.reasons;

  // Step 3: Store result
  const [saved] = await db
    .insert(assetValidationsTable)
    .values({
      projectId,
      assetName,
      assetContent,
      assetType,
      assetHash: contentHash,
      validationResult: finalStatus,
      reasons: finalReasons,
      confidence: String(aiResult.confidence),
      tokensUsed: aiResult.tokensUsed,
      latency: aiResult.latency,
      cost: String(aiResult.cost),
      rawResponse: aiResult.rawResponse,
      preCheckResults,
    })
    .returning();

  res.json({
    id: saved.id,
    status: finalStatus,
    reasons: finalReasons,
    confidence: aiResult.confidence,
    tokensUsed: aiResult.tokensUsed,
    cost: aiResult.cost,
    latency: aiResult.latency,
    rawResponse: aiResult.rawResponse,
    preCheckResults,
  });
});

router.get("/validations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetValidationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: assetValidationsTable.id,
      projectId: assetValidationsTable.projectId,
      projectName: projectsTable.name,
      assetName: assetValidationsTable.assetName,
      assetContent: assetValidationsTable.assetContent,
      assetType: assetValidationsTable.assetType,
      validationResult: assetValidationsTable.validationResult,
      reasons: assetValidationsTable.reasons,
      tokensUsed: assetValidationsTable.tokensUsed,
      cost: assetValidationsTable.cost,
      latency: assetValidationsTable.latency,
      confidence: assetValidationsTable.confidence,
      rawResponse: assetValidationsTable.rawResponse,
      preCheckResults: assetValidationsTable.preCheckResults,
      createdAt: assetValidationsTable.createdAt,
    })
    .from(assetValidationsTable)
    .leftJoin(projectsTable, eq(assetValidationsTable.projectId, projectsTable.id))
    .where(eq(assetValidationsTable.id, params.data.id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Validation not found" });
    return;
  }

  res.json({
    ...row,
    projectName: row.projectName ?? "Unknown",
    tokensUsed: Number(row.tokensUsed),
    cost: Number(row.cost),
    confidence: Number(row.confidence),
  });
});

router.get("/validations", requireAuth, async (req, res): Promise<void> => {
  const params = ListValidationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.projectId != null) {
    conditions.push(eq(assetValidationsTable.projectId, params.data.projectId));
  }
  if (params.data.result != null) {
    conditions.push(eq(assetValidationsTable.validationResult, params.data.result as "PASS" | "FAIL"));
  }

  const rows = await db
    .select({
      id: assetValidationsTable.id,
      projectId: assetValidationsTable.projectId,
      projectName: projectsTable.name,
      assetName: assetValidationsTable.assetName,
      validationResult: assetValidationsTable.validationResult,
      reasons: assetValidationsTable.reasons,
      tokensUsed: assetValidationsTable.tokensUsed,
      cost: assetValidationsTable.cost,
      latency: assetValidationsTable.latency,
      confidence: assetValidationsTable.confidence,
      rawResponse: assetValidationsTable.rawResponse,
      preCheckResults: assetValidationsTable.preCheckResults,
      createdAt: assetValidationsTable.createdAt,
    })
    .from(assetValidationsTable)
    .leftJoin(projectsTable, eq(assetValidationsTable.projectId, projectsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(assetValidationsTable.createdAt))
    .limit(200);

  res.json(rows.map(r => ({
    ...r,
    projectName: r.projectName ?? "Unknown",
    tokensUsed: Number(r.tokensUsed),
    cost: Number(r.cost),
    confidence: Number(r.confidence),
  })));
});

export default router;
