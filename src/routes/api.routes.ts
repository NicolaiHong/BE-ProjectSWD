import { Router } from "express";
import { ApiController } from "../controllers/api.controller";
import { DeploymentController } from "../controllers/deployment.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateApiRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 200
 *           example: "User Management API"
 *         description:
 *           type: string
 *           nullable: true
 *           maxLength: 2000
 *         base_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://api.example.com/v1"
 *         version:
 *           type: string
 *           nullable: true
 *           example: "1.0.0"
 *         project_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, DEPRECATED]
 *           default: ACTIVE
 *     UpdateApiRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 200
 *         description:
 *           type: string
 *           nullable: true
 *         base_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         version:
 *           type: string
 *           nullable: true
 *         project_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, DEPRECATED]
 *     ApiResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         owner_developer_id:
 *           type: string
 *           format: uuid
 *         project_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         base_url:
 *           type: string
 *           nullable: true
 *         version:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, DEPRECATED]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export const apiRouter = Router();

apiRouter.use(requireAuth);

apiRouter.get("/", ApiController.list);
apiRouter.get("/:id", ApiController.getById);
apiRouter.post("/", ApiController.create);
apiRouter.put("/:id", ApiController.update);
apiRouter.delete("/:id", ApiController.delete);

// Workflow state management
apiRouter.patch("/:id/workflow-state", ApiController.updateWorkflowState);
apiRouter.post("/:id/ready-to-deploy", ApiController.markReadyToDeploy);

// Deployment action (start deployment to a provider)
apiRouter.post("/:id/deploy", DeploymentController.startDeployment);

// API-scoped sessions (no project required)
apiRouter.get("/:id/sessions", ApiController.listSessions);
apiRouter.post("/:id/sessions/run", ApiController.runSession);
apiRouter.get("/:id/sessions/:sessionId", ApiController.getSessionById);
apiRouter.delete("/:id/sessions/:sessionId", ApiController.deleteSessionById);

// API-scoped documents (for API-centric workflow without project)
apiRouter.get("/:id/documents", ApiController.listDocuments);
apiRouter.get("/:id/documents/:type", ApiController.getDocument);
apiRouter.put("/:id/documents/:type", ApiController.upsertDocument);
apiRouter.delete("/:id/documents/:type", ApiController.deleteDocument);
