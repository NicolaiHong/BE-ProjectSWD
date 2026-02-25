import { Request, Response, NextFunction } from "express";
import { ApiConfigService } from "../services/apiConfig.service";
import { CreateApiConfigSchema, UpdateApiConfigSchema } from "../dtos/ApiConfigDtos";
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

export class ApiConfigController {
  /**
   * @openapi
   * /api/apis/{apiId}/configs:
   *   get:
   *     tags: [API Configs]
   *     summary: List configs for an API
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
   *         description: Paginated list of configs
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
   *                     $ref: '#/components/schemas/ApiConfigResponse'
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
    const result = await ApiConfigService.list(param(req, "apiId"), developerId, pag.page, pag.limit);
    return res.json({ success: true, ...result });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/configs/{id}:
   *   get:
   *     tags: [API Configs]
   *     summary: Get config by ID
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
   *         description: Config details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ApiConfigResponse'
   *       404:
   *         description: Not found
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const config = await ApiConfigService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: config });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/configs:
   *   post:
   *     tags: [API Configs]
   *     summary: Create a config
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
   *             $ref: '#/components/schemas/CreateApiConfigRequest'
   *     responses:
   *       201:
   *         description: Config created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ApiConfigResponse'
   *       400:
   *         description: Validation error
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = CreateApiConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const config = await ApiConfigService.create(param(req, "apiId"), developerId, parseResult.data);
    return res.status(201).json({ success: true, data: config });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/configs/{id}:
   *   put:
   *     tags: [API Configs]
   *     summary: Update a config
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
   *             $ref: '#/components/schemas/UpdateApiConfigRequest'
   *     responses:
   *       200:
   *         description: Config updated
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = UpdateApiConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const config = await ApiConfigService.update(param(req, "id"), developerId, parseResult.data);
    return res.json({ success: true, data: config });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/configs/{id}:
   *   delete:
   *     tags: [API Configs]
   *     summary: Delete a config
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
   *         description: Config deleted
   *       404:
   *         description: Not found
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await ApiConfigService.delete(param(req, "id"), developerId);
    return res.status(204).send();
  });
}
