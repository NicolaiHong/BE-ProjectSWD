import { Router } from "express";
import { GeneratedCodeController } from "../controllers/generatedCode.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateGeneratedCodeRequest:
 *       type: object
 *       required:
 *         - file_path
 *         - content
 *       properties:
 *         file_path:
 *           type: string
 *           example: "src/components/UserTable.tsx"
 *         content:
 *           type: string
 *           example: "import React from 'react';\n..."
 *         language:
 *           type: string
 *           nullable: true
 *           example: "typescript"
 *         generation_session_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *     GeneratedCodeResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         api_id:
 *           type: string
 *           format: uuid
 *         generation_session_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         file_path:
 *           type: string
 *         content:
 *           type: string
 *         language:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 */

export const generatedCodeRouter = Router({ mergeParams: true });

generatedCodeRouter.use(requireAuth);

generatedCodeRouter.get("/", GeneratedCodeController.list);
generatedCodeRouter.get("/:id", GeneratedCodeController.getById);
generatedCodeRouter.post("/", GeneratedCodeController.create);
generatedCodeRouter.delete("/:id", GeneratedCodeController.delete);

// Global router for Code History feature (developer-scoped, not API-scoped)
export const globalGeneratedCodeRouter = Router();

globalGeneratedCodeRouter.use(requireAuth);

globalGeneratedCodeRouter.get("/", GeneratedCodeController.listAll);
globalGeneratedCodeRouter.get("/:id", GeneratedCodeController.getByIdGlobal);
globalGeneratedCodeRouter.delete("/:id", GeneratedCodeController.deleteGlobal);
