import { Router } from "express";
import { SessionController } from "../controllers/session.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     GenStatusEnum:
 *       type: string
 *       enum: [QUEUED, RUNNING, SUCCEEDED, FAILED]
 *       description: Generation session status
 *       example: "QUEUED"
 *     RunGenerationRequest:
 *       type: object
 *       properties:
 *         provider:
 *           type: string
 *           enum: [openai, gemini]
 *           default: "openai"
 *           description: AI provider to use
 *           example: "openai"
 *         model:
 *           type: string
 *           minLength: 1
 *           default: "gpt-4o"
 *           description: AI model name
 *           example: "gpt-4o"
 *         framework:
 *           type: string
 *           enum: [react, vue, angular]
 *           default: "react"
 *           description: Frontend framework
 *           example: "react"
 *         cssStrategy:
 *           type: string
 *           enum: [tailwind, css-modules, styled-components]
 *           default: "tailwind"
 *           description: CSS strategy
 *           example: "tailwind"
 *     SessionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Session unique identifier
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         project_id:
 *           type: string
 *           format: uuid
 *           description: Parent project ID
 *         provider:
 *           type: string
 *           description: AI provider used
 *           example: "openai"
 *         model:
 *           type: string
 *           description: AI model used
 *           example: "gpt-4o"
 *         status:
 *           $ref: '#/components/schemas/GenStatusEnum'
 *         error_message:
 *           type: string
 *           nullable: true
 *           description: Error message if generation failed
 *         openapi_sha256:
 *           type: string
 *           nullable: true
 *           description: SHA-256 hash of OpenAPI doc used
 *         entity_schema_sha256:
 *           type: string
 *           nullable: true
 *           description: SHA-256 hash of Entity Schema doc used
 *         action_spec_sha256:
 *           type: string
 *           nullable: true
 *           description: SHA-256 hash of Action Spec doc used
 *         design_system_sha256:
 *           type: string
 *           nullable: true
 *           description: SHA-256 hash of Design System doc used
 *         output_summary_md:
 *           type: string
 *           nullable: true
 *           description: Markdown summary of generated output
 *         repo_commit_sha:
 *           type: string
 *           nullable: true
 *           description: Git commit SHA of generated code
 *         pr_url:
 *           type: string
 *           nullable: true
 *           description: Pull request URL
 *         vercel_deploy_url:
 *           type: string
 *           nullable: true
 *           description: Vercel deployment URL
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         finished_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Completion timestamp
 */

export const sessionRouter = Router();

// All session routes require authentication
sessionRouter.use(requireAuth);

// Nested under /api/projects/:projectId/sessions
sessionRouter.get("/:projectId/sessions", SessionController.list);
sessionRouter.get("/:projectId/sessions/:id", SessionController.getById);
sessionRouter.post("/:projectId/sessions/run", SessionController.run);
sessionRouter.delete("/:projectId/sessions/:id", SessionController.delete);
