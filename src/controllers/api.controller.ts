import { Request, Response, NextFunction } from "express";
import { ApiService } from "../services/api.service";
import { SessionService } from "../services/session.service";
import {
  CreateApiSchema,
  UpdateApiSchema,
  PaginationSchema,
} from "../dtos/ApiDtos";
import { RunApiGenerationSchema } from "../dtos/SessionDtos";
import { BadRequestError } from "../middlewares/errorHandler";
import { ApiDocumentRepository } from "../repositories/apiDocument.repository";
import type { document_type } from "../generated/prisma/enums";
import crypto from "crypto";

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export class ApiController {
  /**
   * @openapi
   * /api/apis:
   *   get:
   *     tags: [APIs]
   *     summary: List all APIs
   *     description: Get all APIs owned by the authenticated developer with pagination.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *     responses:
   *       200:
   *         description: Paginated list of APIs
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ApiResponse'
   *                 total:
   *                   type: integer
   *                 page:
   *                   type: integer
   *                 limit:
   *                   type: integer
   *                 totalPages:
   *                   type: integer
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const pag = PaginationSchema.parse(req.query);
    const result = await ApiService.list(developerId, pag.page, pag.limit);
    return res.json({ success: true, ...result });
  });

  /**
   * @openapi
   * /api/apis/{id}:
   *   get:
   *     tags: [APIs]
   *     summary: Get API by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: API details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/ApiResponse'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const api = await ApiService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: api });
  });

  /**
   * @openapi
   * /api/apis:
   *   post:
   *     tags: [APIs]
   *     summary: Create a new API
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateApiRequest'
   *     responses:
   *       201:
   *         description: API created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/ApiResponse'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = CreateApiSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const api = await ApiService.create(developerId, parseResult.data);
    return res.status(201).json({ success: true, data: api });
  });

  /**
   * @openapi
   * /api/apis/{id}:
   *   put:
   *     tags: [APIs]
   *     summary: Update an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateApiRequest'
   *     responses:
   *       200:
   *         description: API updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/ApiResponse'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = UpdateApiSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const api = await ApiService.update(
      param(req, "id"),
      developerId,
      parseResult.data,
    );
    return res.json({ success: true, data: api });
  });

  /**
   * @openapi
   * /api/apis/{id}:
   *   delete:
   *     tags: [APIs]
   *     summary: Delete an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: API deleted
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await ApiService.delete(param(req, "id"), developerId);
    return res.status(204).send();
  });

  /**
   * @openapi
   * /api/apis/{id}/workflow-state:
   *   patch:
   *     tags: [APIs]
   *     summary: Update workflow state
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - workflow_state
   *             properties:
   *               workflow_state:
   *                 type: string
   *                 enum: [CONFIGURED, UI_GENERATED, CODE_GENERATED, READY_TO_DEPLOY, DEPLOYING, DEPLOYED, FAILED]
   *     responses:
   *       200:
   *         description: Workflow state updated
   *       400:
   *         description: Invalid state
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  static updateWorkflowState = asyncHandler(
    async (req: Request, res: Response) => {
      const developerId = (req as any).developerId as string;
      const { workflow_state } = req.body;
      const validStates = [
        "CONFIGURED",
        "UI_GENERATED",
        "CODE_GENERATED",
        "READY_TO_DEPLOY",
        "DEPLOYING",
        "DEPLOYED",
        "FAILED",
      ];
      if (!workflow_state || !validStates.includes(workflow_state)) {
        throw BadRequestError(
          `Invalid workflow_state. Must be one of: ${validStates.join(", ")}`,
        );
      }
      const api = await ApiService.updateWorkflowState(
        param(req, "id"),
        developerId,
        workflow_state,
      );
      return res.json({ success: true, data: api });
    },
  );

  /**
   * @openapi
   * /api/apis/{id}/ready-to-deploy:
   *   post:
   *     tags: [APIs]
   *     summary: Mark API as ready to deploy
   *     description: Validates that code generation is complete before allowing transition.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: API marked as ready to deploy
   *       400:
   *         description: Prerequisites not met
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  static markReadyToDeploy = asyncHandler(
    async (req: Request, res: Response) => {
      const developerId = (req as any).developerId as string;
      const api = await ApiService.markReadyToDeploy(
        param(req, "id"),
        developerId,
      );
      return res.json({ success: true, data: api });
    },
  );

  /**
   * @openapi
   * /api/apis/{id}/sessions:
   *   get:
   *     tags: [APIs]
   *     summary: List generation sessions for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: mode
   *         schema:
   *           type: string
   *           enum: [PREVIEW, FULL_SOURCE]
   *     responses:
   *       200:
   *         description: List of generation sessions
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  static listSessions = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const mode = req.query.mode as string | undefined;
    const validModes = ["PREVIEW", "FULL_SOURCE"];
    const parsedMode =
      mode && validModes.includes(mode) ? (mode as any) : undefined;
    const sessions = await ApiService.listSessions(
      param(req, "id"),
      developerId,
      parsedMode,
    );
    return res.json({ success: true, data: sessions });
  });

  /**
   * @openapi
   * /api/apis/{id}/sessions/run:
   *   post:
   *     tags: [APIs]
   *     summary: Run generation session for an API (no project required)
   *     description: Starts a new generation session scoped to this API. Documents are resolved from api_documents if no project is linked.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               provider:
   *                 type: string
   *                 enum: [openai, gemini]
   *                 default: openai
   *               model:
   *                 type: string
   *               framework:
   *                 type: string
   *                 enum: [react, vue, angular]
   *                 default: react
   *               cssStrategy:
   *                 type: string
   *                 enum: [tailwind, css-modules, styled-components]
   *                 default: tailwind
   *               mode:
   *                 type: string
   *                 enum: [PREVIEW, FULL_SOURCE]
   *                 default: FULL_SOURCE
   *     responses:
   *       202:
   *         description: Generation session started
   *       400:
   *         description: Missing required documents
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: API not found
   */
  static runSession = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = RunApiGenerationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const session = await SessionService.runApiGeneration(
      param(req, "id"),
      developerId,
      parseResult.data,
    );
    return res.status(202).json({ success: true, data: session });
  });

  /**
   * @openapi
   * /api/apis/{id}/sessions/{sessionId}:
   *   get:
   *     tags: [APIs]
   *     summary: Get a specific session for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Session details
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Session not found
   */
  static getSessionById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const session = await SessionService.getByApiAndId(
      param(req, "id"),
      param(req, "sessionId"),
      developerId,
    );
    return res.json({ success: true, data: session });
  });

  // ===== API Documents (for API-centric workflow without project) =====

  /**
   * @openapi
   * /api/apis/{id}/documents:
   *   get:
   *     tags: [APIs]
   *     summary: List documents for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of documents
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: API not found
   */
  static listDocuments = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const apiId = param(req, "id");
    await ApiService.getById(apiId, developerId); // Verify ownership
    const docs = await ApiDocumentRepository.listByApi(apiId);
    return res.json({ success: true, data: docs });
  });

  /**
   * @openapi
   * /api/apis/{id}/documents/{type}:
   *   get:
   *     tags: [APIs]
   *     summary: Get a specific document for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM]
   *     responses:
   *       200:
   *         description: Document content
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Document not found
   */
  static getDocument = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const apiId = param(req, "id");
    const type = param(req, "type").toUpperCase() as document_type;
    await ApiService.getById(apiId, developerId); // Verify ownership

    const validTypes = [
      "OPENAPI",
      "ENTITY_SCHEMA",
      "ACTION_SPEC",
      "DESIGN_SYSTEM",
    ];
    if (!validTypes.includes(type)) {
      throw BadRequestError(
        `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
      );
    }

    const doc = await ApiDocumentRepository.findByApiAndType(apiId, type);
    if (!doc) {
      throw BadRequestError(`Document type ${type} not found for this API`);
    }
    return res.json({ success: true, data: doc });
  });

  /**
   * @openapi
   * /api/apis/{id}/documents/{type}:
   *   put:
   *     tags: [APIs]
   *     summary: Create or update a document for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - content
   *             properties:
   *               name:
   *                 type: string
   *               content:
   *                 type: string
   *               content_type:
   *                 type: string
   *     responses:
   *       200:
   *         description: Document created/updated
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: API not found
   */
  static upsertDocument = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const apiId = param(req, "id");
    const type = param(req, "type").toUpperCase() as document_type;
    await ApiService.getById(apiId, developerId); // Verify ownership

    const validTypes = [
      "OPENAPI",
      "ENTITY_SCHEMA",
      "ACTION_SPEC",
      "DESIGN_SYSTEM",
    ];
    if (!validTypes.includes(type)) {
      throw BadRequestError(
        `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
      );
    }

    const { name, content, content_type } = req.body;
    if (!name || typeof name !== "string") {
      throw BadRequestError("name is required and must be a string");
    }
    if (!content || typeof content !== "string") {
      throw BadRequestError("content is required and must be a string");
    }

    const sha256 = crypto.createHash("sha256").update(content).digest("hex");

    const doc = await ApiDocumentRepository.upsert(apiId, type, {
      name,
      content,
      content_type: content_type || null,
      sha256,
    });
    return res.json({ success: true, data: doc });
  });

  /**
   * @openapi
   * /api/apis/{id}/documents/{type}:
   *   delete:
   *     tags: [APIs]
   *     summary: Delete a document for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM]
   *     responses:
   *       204:
   *         description: Document deleted
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: API or document not found
   */
  static deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const apiId = param(req, "id");
    const type = param(req, "type").toUpperCase() as document_type;
    await ApiService.getById(apiId, developerId); // Verify ownership

    const validTypes = [
      "OPENAPI",
      "ENTITY_SCHEMA",
      "ACTION_SPEC",
      "DESIGN_SYSTEM",
    ];
    if (!validTypes.includes(type)) {
      throw BadRequestError(
        `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
      );
    }

    await ApiDocumentRepository.delete(apiId, type);
    return res.status(204).send();
  });
}
