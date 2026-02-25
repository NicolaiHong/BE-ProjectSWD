import { Router } from "express";
import { DocumentController } from "../controllers/document.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     DocumentTypeEnum:
 *       type: string
 *       enum: [OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM]
 *       description: Type of project document
 *       example: "OPENAPI"
 *     UpsertDocumentRequest:
 *       type: object
 *       required:
 *         - name
 *         - content
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Document name
 *           example: "api-spec.yaml"
 *         content:
 *           type: string
 *           minLength: 1
 *           description: Document content (JSON, YAML, etc.)
 *           example: '{"openapi": "3.0.0", "info": {"title": "My API"}}'
 *         content_type:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: MIME content type
 *           default: "application/json"
 *           example: "application/json"
 *     DocumentResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Document unique identifier
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         project_id:
 *           type: string
 *           format: uuid
 *           description: Parent project ID
 *         type:
 *           $ref: '#/components/schemas/DocumentTypeEnum'
 *         name:
 *           type: string
 *           description: Document name
 *           example: "api-spec.yaml"
 *         content_type:
 *           type: string
 *           nullable: true
 *           description: MIME content type
 *         content:
 *           type: string
 *           description: Document content
 *         sha256:
 *           type: string
 *           description: SHA-256 hash of the content
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

export const documentRouter = Router();

// All document routes require authentication
documentRouter.use(requireAuth);

// Nested under /api/projects/:projectId/documents
documentRouter.get("/:projectId/documents", DocumentController.list);
documentRouter.get("/:projectId/documents/:type", DocumentController.getByType);
documentRouter.put("/:projectId/documents/:type", DocumentController.upsert);
documentRouter.delete("/:projectId/documents/:type", DocumentController.delete);
