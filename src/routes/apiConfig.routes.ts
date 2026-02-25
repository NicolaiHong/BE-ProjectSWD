import { Router } from "express";
import { ApiConfigController } from "../controllers/apiConfig.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateApiConfigRequest:
 *       type: object
 *       required:
 *         - key
 *         - value
 *       properties:
 *         key:
 *           type: string
 *           maxLength: 200
 *           example: "API_KEY"
 *         value:
 *           type: string
 *           example: "sk-xxxxx"
 *         is_secret:
 *           type: boolean
 *           default: false
 *     UpdateApiConfigRequest:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *           maxLength: 200
 *         value:
 *           type: string
 *         is_secret:
 *           type: boolean
 *     ApiConfigResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         api_id:
 *           type: string
 *           format: uuid
 *         key:
 *           type: string
 *         value:
 *           type: string
 *         is_secret:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export const apiConfigRouter = Router({ mergeParams: true });

apiConfigRouter.use(requireAuth);

apiConfigRouter.get("/", ApiConfigController.list);
apiConfigRouter.get("/:id", ApiConfigController.getById);
apiConfigRouter.post("/", ApiConfigController.create);
apiConfigRouter.put("/:id", ApiConfigController.update);
apiConfigRouter.delete("/:id", ApiConfigController.delete);
