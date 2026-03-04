import { Request, Response, NextFunction } from "express";
import { GenerateService } from "../services/generate.service";
import { GenerateRequestSchema } from "../dtos/GenerateDtos";
import { BadRequestError } from "../middlewares/errorHandler";

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class GenerateController {
  /**
   * @openapi
   * /api/generate:
   *   post:
   *     tags: [Generate]
   *     summary: Generate code from prompt (VS Code Extension)
   *     description: >
   *       Simple endpoint for VS Code Extension. Takes a prompt and returns generated code files.
   *       No authentication required. If apiId is provided, generated codes are saved to the database.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GenerateRequest'
   *     responses:
   *       200:
   *         description: Code generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenerateResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: AI provider error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static generate = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = GenerateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }

    const { prompt, apiId, provider, model, apiKey } = parseResult.data;
    const result = await GenerateService.generate(prompt, provider, model, apiId, apiKey);
    return res.json(result);
  });
}
