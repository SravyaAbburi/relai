import { Router } from "express";
import { db, projectConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetProjectConfigParams, UpsertProjectConfigParams, UpsertProjectConfigBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/projects/:id/config", requireAuth, async (req, res): Promise<void> => {
  const params = GetProjectConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let [config] = await db
    .select()
    .from(projectConfigsTable)
    .where(eq(projectConfigsTable.projectId, params.data.id))
    .limit(1);

  if (!config) {
    // Return default config
    const [created] = await db
      .insert(projectConfigsTable)
      .values({
        projectId: params.data.id,
        validationRules: "",
        enableDuplicationCheck: true,
        enablePIIValidation: true,
        enableBlurCheck: true,
      })
      .returning();
    config = created;
  }

  res.json(config);
});

router.post("/projects/:id/config", requireAuth, async (req, res): Promise<void> => {
  const params = UpsertProjectConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpsertProjectConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectConfigsTable)
    .where(eq(projectConfigsTable.projectId, params.data.id))
    .limit(1);

  const updates = {
    validationRules: parsed.data.validationRules ?? "",
    enableDuplicationCheck: parsed.data.enableDuplicationCheck ?? true,
    enablePIIValidation: parsed.data.enablePIIValidation ?? true,
    enableBlurCheck: parsed.data.enableBlurCheck ?? true,
    updatedAt: new Date(),
  };

  let config;
  if (existing) {
    const [updated] = await db
      .update(projectConfigsTable)
      .set(updates)
      .where(eq(projectConfigsTable.projectId, params.data.id))
      .returning();
    config = updated;
  } else {
    const [created] = await db
      .insert(projectConfigsTable)
      .values({ projectId: params.data.id, ...updates })
      .returning();
    config = created;
  }

  res.json(config);
});

export default router;
