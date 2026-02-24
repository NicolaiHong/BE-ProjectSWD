import { Router } from "express";
import { DocumentController } from "../controllers/document.controller";
import { requireAuth } from "../middlewares/authJwt";

export const documentRouter = Router();

// All document routes require authentication
documentRouter.use(requireAuth);

// Nested under /api/projects/:projectId/documents
documentRouter.get("/:projectId/documents", DocumentController.list);
documentRouter.get("/:projectId/documents/:type", DocumentController.getByType);
documentRouter.put("/:projectId/documents/:type", DocumentController.upsert);
documentRouter.delete("/:projectId/documents/:type", DocumentController.delete);
