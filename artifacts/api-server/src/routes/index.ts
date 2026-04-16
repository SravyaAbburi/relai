import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import configsRouter from "./configs";
import validationsRouter from "./validations";
import observabilityRouter from "./observability";
import promptsRouter from "./prompts";

const router: IRouter = Router();

// router.use(healthRouter);
// router.use(authRouter);
// router.use(usersRouter);
// router.use(projectsRouter);
// router.use(configsRouter);
// router.use(validationsRouter);
// router.use(observabilityRouter);
// router.use(promptsRouter);
router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/projects", projectsRouter);
router.use("/configs", configsRouter);
router.use("/validations", validationsRouter);
router.use("/observability", observabilityRouter);
router.use("/prompts", promptsRouter);

export default router;
