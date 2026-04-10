import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectConfigsTable = pgTable("project_configs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  validationRules: text("validation_rules").notNull().default(""),
  enableDuplicationCheck: boolean("enable_duplication_check").notNull().default(true),
  enablePIIValidation: boolean("enable_pii_validation").notNull().default(true),
  enableBlurCheck: boolean("enable_blur_check").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectConfigSchema = createInsertSchema(projectConfigsTable).omit({ id: true });
export type InsertProjectConfig = z.infer<typeof insertProjectConfigSchema>;
export type ProjectConfig = typeof projectConfigsTable.$inferSelect;
