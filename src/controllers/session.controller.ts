import { Request, Response, NextFunction } from "express";
import { SessionService } from "../services/session.service";
import { RunGenerationSchema, SessionFilterSchema } from "../dtos/SessionDtos";
import { BadRequestError } from "../middlewares/errorHandler";
import type { gen_status } from "../generated/prisma";

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

export class SessionController {
  /**
   * @openapi
   * /api/projects/{projectId}/sessions:
   *   get:
   *     tags: [Sessions]
   *     summary: List generation sessions
   *     description: Get all generation sessions for a project, optionally filtered by status.
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
   *       - in: query
   *         name: status
   *         required: false
   *         schema:
   *           $ref: '#/components/schemas/GenStatusEnum'
   *         description: Filter sessions by status
   *     responses:
   *       200:
   *         description: List of generation sessions
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
   *                     $ref: '#/components/schemas/SessionResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const filterResult = SessionFilterSchema.safeParse(req.query);
    const status = filterResult.success ? filterResult.data.status as gen_status | undefined : undefined;
    const sessions = await SessionService.listByProject(
      param(req, "projectId"),
      developerId,
      status,
    );
    return res.json({ success: true, data: sessions });
  });

  /**
   * @openapi
   * /api/projects/{projectId}/sessions/{id}:
   *   get:
   *     tags: [Sessions]
   *     summary: Get session by ID
   *     description: Get a single generation session by its ID.
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
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Session ID
   *     responses:
   *       200:
   *         description: Session details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/SessionResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Session not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const session = await SessionService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: session });
  });

  /**
   * @openapi
   * /api/projects/{projectId}/sessions/run:
   *   post:
   *     tags: [Sessions]
   *     summary: Run AI code generation
   *     description: Trigger an AI code generation session for the project. The generation runs asynchronously.
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
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RunGenerationRequest'
   *     responses:
   *       202:
   *         description: Generation session started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/SessionResponse'
   *       400:
   *         description: Validation error
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
  static run = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = RunGenerationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const session = await SessionService.runGeneration(
      param(req, "projectId"),
      developerId,
      parseResult.data,
    );
    return res.status(202).json({ success: true, data: session });
  });
}
