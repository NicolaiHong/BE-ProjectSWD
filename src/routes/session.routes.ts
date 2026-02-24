import { Router } from "express";
import { SessionController } from "../controllers/session.controller";
import { requireAuth } from "../middlewares/authJwt";

export const sessionRouter = Router();

// All session routes require authentication
sessionRouter.use(requireAuth);

// Nested under /api/projects/:projectId/sessions
sessionRouter.get("/:projectId/sessions", SessionController.list);
sessionRouter.get("/:projectId/sessions/:id", SessionController.getById);
sessionRouter.post("/:projectId/sessions/run", SessionController.run);
