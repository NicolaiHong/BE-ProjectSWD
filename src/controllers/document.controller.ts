import { Request, Response, NextFunction } from "express";
import { DocumentService } from "../services/document.service";
import { UpsertDocumentSchema, DocumentTypeEnum } from "../dtos/DocumentDtos";
import { BadRequestError } from "../middlewares/errorHandler";
import type { document_type } from "../generated/prisma";

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

function parseDocType(raw: string): document_type {
  const result = DocumentTypeEnum.safeParse(raw.toUpperCase());
  if (!result.success) {
    throw BadRequestError(
      `Invalid document type: ${raw}. Must be one of: OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM`,
    );
  }
  return result.data as document_type;
}

export class DocumentController {
  /**
   * @openapi
   * /api/projects/{projectId}/documents:
   *   get:
   *     tags: [Documents]
   *     summary: List project documents
   *     description: Get all documents belonging to a project.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Project ID
   *     responses:
   *       200:
   *         description: List of documents
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
   *                     $ref: '#/components/schemas/DocumentResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Project not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const docs = await DocumentService.listByProject(param(req, "projectId"), developerId);
    return res.json({ success: true, data: docs });
  });

  /**
   * @openapi
   * /api/projects/{projectId}/documents/{type}:
   *   get:
   *     tags: [Documents]
   *     summary: Get document by type
   *     description: Get a specific document by its type (OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM).
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Project ID
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           $ref: '#/components/schemas/DocumentTypeEnum'
   *         description: Document type
   *     responses:
   *       200:
   *         description: Document details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/DocumentResponse'
   *       400:
   *         description: Invalid document type
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Document not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static getByType = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const type = parseDocType(param(req, "type"));
    const doc = await DocumentService.getByType(param(req, "projectId"), type, developerId);
    return res.json({ success: true, data: doc });
  });

  /**
   * @openapi
   * /api/projects/{projectId}/documents/{type}:
   *   put:
   *     tags: [Documents]
   *     summary: Create or update a document
   *     description: Upsert a document for the given project and type. Creates if not exists, updates if it does.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Project ID
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           $ref: '#/components/schemas/DocumentTypeEnum'
   *         description: Document type
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpsertDocumentRequest'
   *     responses:
   *       200:
   *         description: Document created or updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/DocumentResponse'
   *       400:
   *         description: Validation error or invalid document type
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static upsert = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const type = parseDocType(param(req, "type"));
    const parseResult = UpsertDocumentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const doc = await DocumentService.upsert(
      param(req, "projectId"),
      type,
      developerId,
      parseResult.data,
    );
    return res.json({ success: true, data: doc });
  });

  /**
   * @openapi
   * /api/projects/{projectId}/documents/{type}:
   *   delete:
   *     tags: [Documents]
   *     summary: Delete a document
   *     description: Delete a document by project ID and type.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Project ID
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           $ref: '#/components/schemas/DocumentTypeEnum'
   *         description: Document type
   *     responses:
   *       204:
   *         description: Document deleted successfully
   *       400:
   *         description: Invalid document type
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Document not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const type = parseDocType(param(req, "type"));
    await DocumentService.delete(param(req, "projectId"), type, developerId);
    return res.status(204).send();
  });
}
