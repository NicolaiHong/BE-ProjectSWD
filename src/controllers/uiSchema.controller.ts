import { Request, Response, NextFunction } from "express";
import { UiSchemaService } from "../services/uiSchema.service";
import { CreateUiSchemaSchema, UpdateUiSchemaSchema } from "../dtos/UiSchemaDtos";
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

export class UiSchemaController {
  /**
   * @openapi
   * /api/apis/{apiId}/ui-schemas:
   *   get:
   *     tags: [UI Schemas]
   *     summary: List UI schemas for an API
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
   *         description: Paginated list of UI schemas
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
   *                     $ref: '#/components/schemas/UiSchemaResponse'
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
    const result = await UiSchemaService.list(param(req, "apiId"), developerId, pag.page, pag.limit);
    return res.json({ success: true, ...result });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/ui-schemas/{id}:
   *   get:
   *     tags: [UI Schemas]
   *     summary: Get UI schema by ID
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
   *         description: UI Schema details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UiSchemaResponse'
   *       404:
   *         description: Not found
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const schema = await UiSchemaService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: schema });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/ui-schemas:
   *   post:
   *     tags: [UI Schemas]
   *     summary: Create a UI schema
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
   *             $ref: '#/components/schemas/CreateUiSchemaRequest'
   *     responses:
   *       201:
   *         description: UI Schema created
   *       400:
   *         description: Validation error
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = CreateUiSchemaSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const schema = await UiSchemaService.create(param(req, "apiId"), developerId, parseResult.data);
    return res.status(201).json({ success: true, data: schema });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/ui-schemas/{id}:
   *   put:
   *     tags: [UI Schemas]
   *     summary: Update a UI schema
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
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUiSchemaRequest'
   *     responses:
   *       200:
   *         description: UI Schema updated
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = UpdateUiSchemaSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const schema = await UiSchemaService.update(param(req, "id"), developerId, parseResult.data);
    return res.json({ success: true, data: schema });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/ui-schemas/{id}:
   *   delete:
   *     tags: [UI Schemas]
   *     summary: Delete a UI schema
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
   *         description: UI Schema deleted
   *       404:
   *         description: Not found
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await UiSchemaService.delete(param(req, "id"), developerId);
    return res.status(204).send();
  });
}
