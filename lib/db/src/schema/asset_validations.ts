import { pgTable, text, serial, integer, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const assetValidationsTable = pgTable("asset_validations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  assetName: text("asset_name").notNull(),
  assetContent: text("asset_content").notNull().default(""),
  assetType: text("asset_type", { enum: ["image", "text", "audio", "video"] }).notNull().default("text"),
  assetHash: text("asset_hash"),
  validationResult: text("validation_result", { enum: ["PASS", "FAIL"] }).notNull(),
  reasons: jsonb("reasons").notNull().default([]),
  confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull().default("0"),
  tokensUsed: integer("tokens_used").notNull().default(0),
  latency: integer("latency").notNull().default(0),
  cost: numeric("cost", { precision: 10, scale: 6 }).notNull().default("0"),
  rawResponse: text("raw_response").notNull().default(""),
  preCheckResults: jsonb("pre_check_results").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetValidationSchema = createInsertSchema(assetValidationsTable).omit({ id: true, createdAt: true });
export type InsertAssetValidation = z.infer<typeof insertAssetValidationSchema>;
export type AssetValidation = typeof assetValidationsTable.$inferSelect;
