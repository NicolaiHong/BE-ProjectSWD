import { Request, Response } from "express";
import { GeneratorService } from "../services/generator.service";

const svc = new GeneratorService();

/**
 * @swagger
 * /api/generator/apis:
 *   get:
 *     summary: List all APIs that can be used for generation
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of APIs
 */
export const listApis = async (req: Request, res: Response) => {
  const apis = await svc.listApis();
  res.status(200).json({ success: true, message: "OK", data: apis });
};

//list frameworks để extension show QuickPick
/**
 * @swagger
 * /api/generator/frameworks:
 *   get:
 *     summary: List available frontend frameworks
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of frameworks
 */
export const listFrameworks = async (req: Request, res: Response) => {
  const frameworks = svc.getAvailableFrameworks();
  res.status(200).json({ success: true, message: "OK", data: frameworks });
};
/**
 * @swagger
 * /api/generator/ui-schema:
 *   post:
 *     summary: Generate UI schema JSON from API + api_config
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [api_id]
 *             properties:
 *               api_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: UI schema generated
 */

export const generateUiSchema = async (req: Request, res: Response) => {
  try {
    const { api_id } = req.body;
    if (!api_id) {
      return res
        .status(400)
        .json({ success: false, message: "api_id is required" });
    }
    const result = await svc.generateUiSchema(api_id);
    res
      .status(201)
      .json({ success: true, message: "UI schema generated", data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed",
    });
  }
};
/**
 * @swagger
 * /api/generator/code:
 *   post:
 *     summary: Generate frontend code from a UI schema
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schema_id]
 *             properties:
 *               schema_id:
 *                 type: string
 *                 format: uuid
 *               framework:
 *                 type: string
 *                 description: Frontend framework key (react, angular, vue, php, nextjs)
 *     responses:
 *       201:
 *         description: Code generated
 */
export const generateCode = async (req: Request, res: Response) => {
  try {
    const { schema_id, framework } = req.body;
    if (!schema_id) {
      return res
        .status(400)
        .json({ success: false, message: "schema_id is required" });
    }
    // default framework is react
    const result = await svc.generateCode(schema_id, framework || "react");
    res
      .status(201)
      .json({ success: true, message: "Code generated", data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed",
    });
  }
};
