import { Router } from "express";
import { DeploymentController } from "../controllers/deployment.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
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
 *           nullable: true
 *           example: "vercel"
 *         metadata_json:
 *           type: object
 *           nullable: true
 *           example: { "deploy_url": "https://example.vercel.app" }
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
 *         environment:
 *           type: string
 *           enum: [DEVELOPMENT, STAGING, PRODUCTION]
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, DEPLOYED, FAILED, ROLLED_BACK]
 *         provider:
 *           type: string
 *           nullable: true
 *         metadata_json:
 *           type: object
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

deploymentRouter.get("/", DeploymentController.list);
deploymentRouter.get("/:id", DeploymentController.getById);
deploymentRouter.post("/", DeploymentController.create);
deploymentRouter.put("/:id", DeploymentController.update);
deploymentRouter.delete("/:id", DeploymentController.delete);
