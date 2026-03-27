import { Request, Response, NextFunction } from "express";
import { DeploymentService } from "../services/deployment.service";
import { CreateDeploymentSchema, UpdateDeploymentSchema, StartDeploymentSchema } from "../dtos/DeploymentDtos";
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

export class DeploymentController {
  /**
   * @openapi
   * /api/apis/{apiId}/deployments/providers:
   *   get:
   *     tags: [Deployments]
   *     summary: Get available deployment providers
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: apiId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of available providers
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
   *                     type: object
   *                     properties:
   *                       type:
   *                         type: string
   *                         enum: [VERCEL, RENDER, GITHUB_PAGES]
   *                       name:
   *                         type: string
   */
  static getProviders = asyncHandler(async (req: Request, res: Response) => {
    const providers = DeploymentService.getProviders();
    return res.json({ success: true, data: providers });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments:
   *   get:
   *     tags: [Deployments]
   *     summary: List deployments for an API
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
   *         description: Paginated list of deployments
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
   *                     $ref: '#/components/schemas/DeploymentResponse'
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
    const result = await DeploymentService.list(param(req, "apiId"), developerId, pag.page, pag.limit);
    return res.json({ success: true, ...result });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments/{id}:
   *   get:
   *     tags: [Deployments]
   *     summary: Get deployment by ID
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
   *         description: Deployment details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DeploymentResponse'
   *       404:
   *         description: Not found
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const deployment = await DeploymentService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: deployment });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments:
   *   post:
   *     tags: [Deployments]
   *     summary: Create a deployment record
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
   *             $ref: '#/components/schemas/CreateDeploymentRequest'
   *     responses:
   *       201:
   *         description: Deployment created
   *       400:
   *         description: Validation error
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = CreateDeploymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const deployment = await DeploymentService.create(param(req, "apiId"), developerId, parseResult.data);
    return res.status(201).json({ success: true, data: deployment });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deploy:
   *   post:
   *     tags: [Deployments]
   *     summary: Start a deployment to a provider
   *     description: Triggers a deployment workflow for the specified provider (Vercel, Render, or GitHub Pages)
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
   *             $ref: '#/components/schemas/StartDeploymentRequest'
   *     responses:
   *       201:
   *         description: Deployment started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DeploymentResponse'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validation error or prerequisites not met
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: API not found
   */
  static startDeployment = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = StartDeploymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const deployment = await DeploymentService.startDeployment(
      param(req, "apiId"),
      developerId,
      parseResult.data
    );
    return res.status(201).json({
      success: true,
      data: deployment,
      message: "Deployment started. Check status for progress.",
    });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments/{id}/status:
   *   get:
   *     tags: [Deployments]
   *     summary: Get deployment status from provider
   *     description: Checks the current status of a deployment with the provider
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
   *         description: Deployment status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DeploymentResponse'
   *       404:
   *         description: Deployment not found
   */
  static getStatus = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const status = await DeploymentService.getDeploymentStatus(param(req, "id"), developerId);
    return res.json({ success: true, data: status });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments/{id}/retry:
   *   post:
   *     tags: [Deployments]
   *     summary: Retry a failed deployment
   *     description: Creates a new deployment attempt for a previously failed deployment
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
   *       201:
   *         description: Retry deployment started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DeploymentResponse'
   *                 message:
   *                   type: string
   *       400:
   *         description: Cannot retry (deployment not failed)
   *       404:
   *         description: Deployment not found
   */
  static retry = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const deployment = await DeploymentService.retryDeployment(param(req, "id"), developerId);
    return res.status(201).json({
      success: true,
      data: deployment,
      message: "Retry deployment started. Check status for progress.",
    });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments/{id}:
   *   put:
   *     tags: [Deployments]
   *     summary: Update a deployment
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
   *             $ref: '#/components/schemas/UpdateDeploymentRequest'
   *     responses:
   *       200:
   *         description: Deployment updated
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = UpdateDeploymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const deployment = await DeploymentService.update(param(req, "id"), developerId, parseResult.data);
    return res.json({ success: true, data: deployment });
  });

  /**
   * @openapi
   * /api/apis/{apiId}/deployments/{id}:
   *   delete:
   *     tags: [Deployments]
   *     summary: Delete a deployment
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
   *         description: Deployment deleted
   *       404:
   *         description: Not found
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await DeploymentService.delete(param(req, "id"), developerId);
    return res.status(204).send();
  });
}
