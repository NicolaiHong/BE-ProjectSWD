import { Request, Response, NextFunction } from "express";
import { ApiService } from "../services/api.service";
import { CreateApiSchema, UpdateApiSchema, PaginationSchema } from "../dtos/ApiDtos";
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
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
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
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const api = await ApiService.update(param(req, "id"), developerId, parseResult.data);
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
}
