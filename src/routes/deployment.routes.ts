import { Router } from "express";
import { DeploymentController } from "../controllers/deployment.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     StartDeploymentRequest:
 *       type: object
 *       required:
 *         - provider
 *       properties:
 *         provider:
 *           type: string
 *           enum: [VERCEL, RENDER, GITHUB_PAGES]
 *           description: Deployment provider to use
 *         environment:
 *           type: string
 *           enum: [DEVELOPMENT, STAGING, PRODUCTION]
 *           default: DEVELOPMENT
 *         generation_session_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional generation session to deploy from
 *         options:
 *           type: object
 *           description: Provider-specific options
 *     CreateDeploymentRequest:
 *       type: object
 *       properties:
 *         environment:
 *           type: string
 *           enum: [DEVELOPMENT, STAGING, PRODUCTION]
 *           default: DEVELOPMENT
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, DEPLOYED, FAILED, ROLLED_BACK]
 *           default: PENDING
 *         provider:
 *           type: string
 *           enum: [VERCEL, RENDER, GITHUB_PAGES]
 *           nullable: true
 *         deploy_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         error_message:
 *           type: string
 *           nullable: true
 *         metadata_json:
 *           type: object
 *           nullable: true
 *     UpdateDeploymentRequest:
 *       type: object
 *       properties:
 *         environment:
 *           type: string
 *           enum: [DEVELOPMENT, STAGING, PRODUCTION]
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, DEPLOYED, FAILED, ROLLED_BACK]
 *         provider:
 *           type: string
 *           enum: [VERCEL, RENDER, GITHUB_PAGES]
 *           nullable: true
 *         deploy_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         error_message:
 *           type: string
 *           nullable: true
 *         metadata_json:
 *           type: object
 *           nullable: true
 *     DeploymentResponse:
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
 *         environment:
 *           type: string
 *           enum: [DEVELOPMENT, STAGING, PRODUCTION]
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, DEPLOYED, FAILED, ROLLED_BACK]
 *         provider:
 *           type: string
 *           enum: [VERCEL, RENDER, GITHUB_PAGES]
 *           nullable: true
 *         deploy_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Live deployment URL (available after successful deployment)
 *         error_message:
 *           type: string
 *           nullable: true
 *           description: Error details if deployment failed
 *         metadata_json:
 *           type: object
 *           nullable: true
 *         started_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         finished_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export const deploymentRouter = Router({ mergeParams: true });

deploymentRouter.use(requireAuth);

// Get available providers
deploymentRouter.get("/providers", DeploymentController.getProviders);

// List deployments
deploymentRouter.get("/", DeploymentController.list);

// Get deployment by ID
deploymentRouter.get("/:id", DeploymentController.getById);

// Get deployment status from provider
deploymentRouter.get("/:id/status", DeploymentController.getStatus);

// Create deployment record (CRUD)
deploymentRouter.post("/", DeploymentController.create);

// Retry a failed deployment
deploymentRouter.post("/:id/retry", DeploymentController.retry);

// Update deployment
deploymentRouter.put("/:id", DeploymentController.update);

// Delete deployment
deploymentRouter.delete("/:id", DeploymentController.delete);

// ───── Fix Workflow Routes ─────

// Fix with AI (user + AI collaborate)
deploymentRouter.post("/:id/fix-with-ai", DeploymentController.fixWithAI);

// Auto-fix (fully automated AI fix, max 2 attempts)
deploymentRouter.post("/:id/auto-fix", DeploymentController.autoFix);

// Mark for manual user fix
deploymentRouter.post("/:id/mark-user-fix", DeploymentController.markUserFix);

// Get deployment error logs / metadata
deploymentRouter.get("/:id/logs", DeploymentController.getLogs);
