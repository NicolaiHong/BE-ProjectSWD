import { Request, Response } from "express";
import { GeneratorService } from "../services/generator.service";

const svc = new GeneratorService();

// ==================== API CRUD ====================

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

/**
 * @swagger
 * /api/generator/apis:
 *   post:
 *     summary: Create a new API
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, method, endpoint]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Product API
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE]
 *                 example: GET
 *               endpoint:
 *                 type: string
 *                 example: /api/products
 *               description:
 *                 type: string
 *                 example: API to manage products
 *     responses:
 *       201:
 *         description: API created successfully
 */
export const createApi = async (req: Request, res: Response) => {
  try {
    const result = await svc.createApi(req.body);
    res
      .status(201)
      .json({ success: true, message: "API created", data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create API",
    });
  }
};

/**
 * @swagger
 * /api/generator/apis/{id}:
 *   get:
 *     summary: Get API by ID
 *     tags: [Generator]
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
 */
export const getApiById = async (req: Request, res: Response) => {
  try {
    const result = await svc.getApiById(req.params.id as string);
    res.status(200).json({ success: true, message: "OK", data: result });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "API not found",
    });
  }
};

/**
 * @swagger
 * /api/generator/apis/{id}:
 *   put:
 *     summary: Update API
 *     tags: [Generator]
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
 *             properties:
 *               name:
 *                 type: string
 *               method:
 *                 type: string
 *               endpoint:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: API updated
 */
export const updateApi = async (req: Request, res: Response) => {
  try {
    const result = await svc.updateApi(req.params.id as string, req.body);
    res
      .status(200)
      .json({ success: true, message: "API updated", data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update API",
    });
  }
};

/**
 * @swagger
 * /api/generator/apis/{id}:
 *   delete:
 *     summary: Delete API
 *     tags: [Generator]
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
 *         description: API deleted
 */
export const deleteApi = async (req: Request, res: Response) => {
  try {
    const result = await svc.deleteApi(req.params.id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete API",
    });
  }
};

// ==================== API CONFIG ====================

/**
 * @swagger
 * /api/generator/api-config:
 *   post:
 *     summary: Create API configuration
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
 *               auth_required:
 *                 type: boolean
 *                 default: false
 *               pagination:
 *                 type: boolean
 *                 default: true
 *               searchable:
 *                 type: boolean
 *                 default: true
 *               columns:
 *                 type: array
 *                 items:
 *                   type: object
 *                 example: [{"key": "name", "label": "Name"}, {"key": "price", "label": "Price"}]
 *               filters:
 *                 type: array
 *                 items:
 *                   type: object
 *                 example: [{"key": "category", "label": "Category"}]
 *     responses:
 *       201:
 *         description: Config created
 */
export const createApiConfig = async (req: Request, res: Response) => {
  try {
    const result = await svc.createApiConfig(req.body);
    res
      .status(201)
      .json({ success: true, message: "API Config created", data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create config",
    });
  }
};

/**
 * @swagger
 * /api/generator/api-config/{api_id}:
 *   get:
 *     summary: Get API configuration by API ID
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: api_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: API Config details
 */
export const getApiConfig = async (req: Request, res: Response) => {
  try {
    const result = await svc.getApiConfig(req.params.api_id as string);
    res.status(200).json({ success: true, message: "OK", data: result });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Config not found",
    });
  }
};

/**
 * @swagger
 * /api/generator/api-config/{config_id}:
 *   put:
 *     summary: Update API configuration
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: config_id
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
 *             properties:
 *               auth_required:
 *                 type: boolean
 *               pagination:
 *                 type: boolean
 *               searchable:
 *                 type: boolean
 *               columns:
 *                 type: array
 *               filters:
 *                 type: array
 *     responses:
 *       200:
 *         description: Config updated
 */
export const updateApiConfig = async (req: Request, res: Response) => {
  try {
    const result = await svc.updateApiConfig(
      req.params.config_id as string,
      req.body,
    );
    res
      .status(200)
      .json({ success: true, message: "Config updated", data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update config",
    });
  }
};

// ==================== FRAMEWORKS ====================

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

// ==================== UI SCHEMA ====================

/**
 * @swagger
 * /api/generator/ui-schemas:
 *   get:
 *     summary: List all UI schemas
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of UI schemas
 */
export const listUISchemas = async (req: Request, res: Response) => {
  const schemas = await svc.listUISchemas();
  res.status(200).json({ success: true, message: "OK", data: schemas });
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
 * /api/generator/ui-schema/{id}:
 *   get:
 *     summary: Get UI schema by ID
 *     tags: [Generator]
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
 *         description: UI Schema details
 */
export const getUISchemaById = async (req: Request, res: Response) => {
  try {
    const result = await svc.getUISchemaById(req.params.id as string);
    res.status(200).json({ success: true, message: "OK", data: result });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Schema not found",
    });
  }
};

/**
 * @swagger
 * /api/generator/ui-schema/{id}:
 *   delete:
 *     summary: Delete UI schema
 *     tags: [Generator]
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
 *         description: Schema deleted
 */
export const deleteUISchema = async (req: Request, res: Response) => {
  try {
    const result = await svc.deleteUISchema(req.params.id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete schema",
    });
  }
};

// ==================== GENERATED CODE ====================

/**
 * @swagger
 * /api/generator/codes:
 *   get:
 *     summary: List all generated codes
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of generated codes
 */
export const listGeneratedCodes = async (req: Request, res: Response) => {
  const codes = await svc.listGeneratedCodes();
  res.status(200).json({ success: true, message: "OK", data: codes });
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
 *                 enum: [react, angular, vue, php, nextjs]
 *                 default: react
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

/**
 * @swagger
 * /api/generator/code/{id}:
 *   get:
 *     summary: Get generated code by ID
 *     tags: [Generator]
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
 */
export const getGeneratedCodeById = async (req: Request, res: Response) => {
  try {
    const result = await svc.getGeneratedCodeById(req.params.id as string);
    res.status(200).json({ success: true, message: "OK", data: result });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Code not found",
    });
  }
};

/**
 * @swagger
 * /api/generator/code/{id}:
 *   delete:
 *     summary: Delete generated code
 *     tags: [Generator]
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
 *         description: Code deleted
 */
export const deleteGeneratedCode = async (req: Request, res: Response) => {
  try {
    const result = await svc.deleteGeneratedCode(req.params.id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete code",
    });
  }
};

// ==================== HISTORY ====================

/**
 * @swagger
 * /api/generator/history:
 *   get:
 *     summary: Get generation history (API -> Schema -> Code)
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Generation history
 */
export const getHistory = async (req: Request, res: Response) => {
  const history = await svc.getGenerationHistory();
  res.status(200).json({ success: true, message: "OK", data: history });
};

// ==================== FULL GENERATE ====================

/**
 * @swagger
 * /api/generator/generate-full:
 *   post:
 *     summary: One-click full generation (API -> Config -> Schema -> Code)
 *     description: Generate everything in one request. Either provide api_id for existing API or api object to create new one.
 *     tags: [Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               api_id:
 *                 type: string
 *                 format: uuid
 *                 description: Existing API ID (optional if api is provided)
 *               api:
 *                 type: object
 *                 description: New API data (optional if api_id is provided)
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Product API
 *                   method:
 *                     type: string
 *                     example: GET
 *                   endpoint:
 *                     type: string
 *                     example: /api/products
 *                   description:
 *                     type: string
 *               config:
 *                 type: object
 *                 description: API config (optional)
 *                 properties:
 *                   auth_required:
 *                     type: boolean
 *                   pagination:
 *                     type: boolean
 *                   searchable:
 *                     type: boolean
 *                   columns:
 *                     type: array
 *                   filters:
 *                     type: array
 *               framework:
 *                 type: string
 *                 enum: [react, angular, vue, php, nextjs]
 *                 default: react
 *     responses:
 *       201:
 *         description: Full generation completed
 */
export const generateFull = async (req: Request, res: Response) => {
  try {
    const result = await svc.generateFull(req.body);
    res.status(201).json({
      success: true,
      message: "Full generation completed",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Generation failed",
    });
  }
};
