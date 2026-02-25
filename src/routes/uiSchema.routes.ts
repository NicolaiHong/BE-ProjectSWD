import { Router } from "express";
import { UiSchemaController } from "../controllers/uiSchema.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateUiSchemaRequest:
 *       type: object
 *       required:
 *         - name
 *         - schema_json
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 200
 *           example: "User List Page"
 *         schema_json:
 *           type: object
 *           description: JSON schema describing the UI structure
 *           example: { "type": "table", "columns": ["id", "name", "email"] }
 *     UpdateUiSchemaRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 200
 *         schema_json:
 *           type: object
 *     UiSchemaResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         api_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         schema_json:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export const uiSchemaRouter = Router({ mergeParams: true });

uiSchemaRouter.use(requireAuth);

uiSchemaRouter.get("/", UiSchemaController.list);
uiSchemaRouter.get("/:id", UiSchemaController.getById);
uiSchemaRouter.post("/", UiSchemaController.create);
uiSchemaRouter.put("/:id", UiSchemaController.update);
uiSchemaRouter.delete("/:id", UiSchemaController.delete);
