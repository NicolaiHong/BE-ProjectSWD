import { Router } from "express";
import { GenerateController } from "../controllers/generate.controller";

/**
 * @openapi
 * components:
 *   schemas:
 *     GenerateRequest:
 *       type: object
 *       required:
 *         - prompt
 *       properties:
 *         prompt:
 *           type: string
 *           description: Description of the UI to generate, or SQL schema content
 *           example: "Create a user management table with name, email, and role columns"
 *         apiId:
 *           type: string
 *           format: uuid
 *           description: Optional API ID to save generated codes to database
 *         provider:
 *           type: string
 *           enum: [openai, gemini]
 *           default: openai
 *           description: AI provider to use
 *         model:
 *           type: string
 *           default: gpt-4o
 *           description: AI model name
 *         apiKey:
 *           type: string
 *           description: Optional user-provided API key for the selected AI provider. Overrides server default.
 *     GenerateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         changes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "UserManagement.tsx"
 *               codeContent:
 *                 type: string
 *                 example: "import React from 'react';\n..."
 *         summary:
 *           type: string
 *           description: Markdown summary of what was generated
 */

export const generateRouter = Router();

// No auth required for this endpoint
generateRouter.post("/", GenerateController.generate);
