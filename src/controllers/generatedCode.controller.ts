import { Request, Response, NextFunction } from "express";
import { GeneratedCodeService } from "../services/generatedCode.service";
import {
  CreateGeneratedCodeSchema,
  GeneratedCodeFiltersSchema,
} from "../dtos/GeneratedCodeDtos";
import { PaginationSchema } from "../dtos/ApiDtos";
import { BadRequestError } from "../middlewares/errorHandler";

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

export class GeneratedCodeController {
  /**
   * @openapi
   * /api/apis/{apiId}/generated-codes:
   *   get:
   *     tags: [Generated Codes]
   *     summary: List generated codes for an API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: apiId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Paginated list of generated codes
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/GeneratedCodeResponse'
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
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const pag = PaginationSchema.parse(req.query);
    const result = await GeneratedCodeService.list(
      param(req, "apiId"),
      developerId,
      pag.page,
      pag.limit,
    );
    return res.json({ success: true, ...result });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/generated-codes/{id}:
   *   get:
   *     tags: [Generated Codes]
   *     summary: Get generated code by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: apiId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Generated code details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/GeneratedCodeResponse'
   *       404:
   *         description: Not found
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const code = await GeneratedCodeService.getById(
      param(req, "id"),
      developerId,
    );
    return res.json({ success: true, data: code });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/generated-codes:
   *   post:
   *     tags: [Generated Codes]
   *     summary: Create a generated code entry
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: apiId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateGeneratedCodeRequest'
   *     responses:
   *       201:
   *         description: Generated code created
   *       400:
   *         description: Validation error
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = CreateGeneratedCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const code = await GeneratedCodeService.create(
      param(req, "apiId"),
      developerId,
      parseResult.data,
    );
    return res.status(201).json({ success: true, data: code });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/generated-codes/{id}:
   *   delete:
   *     tags: [Generated Codes]
   *     summary: Delete a generated code entry
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: apiId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: Generated code deleted
   *       404:
   *         description: Not found
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await GeneratedCodeService.delete(param(req, "id"), developerId);
    return res.status(204).send();
  });

  // Global endpoints for Code History feature

  /**
   * @openapi
   * /api/generated-codes:
   *   get:
   *     tags: [Generated Codes]
   *     summary: List all generated codes for the authenticated developer
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in file path
   *       - in: query
   *         name: apiId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by API ID
   *       - in: query
   *         name: language
   *         schema:
   *           type: string
   *         description: Filter by language
   *     responses:
   *       200:
   *         description: Paginated list of all generated codes
   */
  static listAll = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const pag = PaginationSchema.parse(req.query);
    const filters = GeneratedCodeFiltersSchema.parse(req.query);
    const result = await GeneratedCodeService.listAll(
      developerId,
      pag.page,
      pag.limit,
      filters,
    );
    return res.json({ success: true, ...result });
  });

  /**
   * @openapi
   * /api/generated-codes/{id}:
   *   get:
   *     tags: [Generated Codes]
   *     summary: Get generated code by ID (global endpoint)
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
   *         description: Generated code details
   *       404:
   *         description: Not found
   */
  static getByIdGlobal = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const code = await GeneratedCodeService.getByIdGlobal(
      param(req, "id"),
      developerId,
    );
    return res.json({ success: true, data: code });
  });

  /**
   * @openapi
   * /api/generated-codes/{id}:
   *   delete:
   *     tags: [Generated Codes]
   *     summary: Delete generated code by ID (global endpoint)
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
   *         description: Generated code deleted
   *       404:
   *         description: Not found
   */
  static deleteGlobal = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await GeneratedCodeService.deleteGlobal(param(req, "id"), developerId);
    return res.status(204).send();
  });
}
