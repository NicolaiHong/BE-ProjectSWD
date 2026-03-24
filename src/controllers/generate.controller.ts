import { Request, Response, NextFunction } from "express";
import { GenerateService } from "../services/generate.service";
import {
  GenerateRequestSchema,
  GeneratePreviewRequestSchema,
} from "../dtos/GenerateDtos";
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
   * /api/generate/templates:
   *   get:
   *     tags: [Generate]
   *     summary: Get pre-built prompt templates
   *     description: Returns a list of pre-built prompt templates for common UI patterns.
   *     responses:
   *       200:
   *         description: List of prompt templates
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 templates:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       label:
   *                         type: string
   *                       description:
   *                         type: string
   *                       prompt:
   *                         type: string
   */
  static getTemplates = asyncHandler(async (_req: Request, res: Response) => {
    const templates = [
      {
        id: "crud-admin",
        label: "CRUD Admin Dashboard",
        description:
          "Full admin dashboard with table, search, pagination, and CRUD modals",
        prompt:
          "Create a complete admin dashboard with a data table that supports search, filtering, sorting, and pagination. Include Create, Read, Update, Delete modals/forms with validation. Add a sidebar navigation and top header with user menu.",
      },
      {
        id: "ecommerce-listing",
        label: "E-commerce Product Listing",
        description: "Product grid with filters, cart, and product detail",
        prompt:
          "Build an e-commerce product listing page with a responsive product grid showing image, name, price, and rating. Include a sidebar with category filters, price range slider, and sorting options. Add an 'Add to Cart' button on each card and a sticky cart summary.",
      },
      {
        id: "auth-pages",
        label: "Authentication Pages",
        description: "Login, Register, and Forgot Password pages",
        prompt:
          "Create authentication pages: Login (email + password with remember me), Register (name, email, password, confirm password with validation), and Forgot Password (email input). Include form validation, error messages, loading states, and links between pages. Add OAuth buttons for Google and GitHub.",
      },
      {
        id: "analytics-dashboard",
        label: "Analytics Dashboard",
        description: "Dashboard with charts, stats cards, and data tables",
        prompt:
          "Build an analytics dashboard with: stat summary cards (total users, revenue, orders, growth), a line chart for revenue over time, a bar chart for monthly comparisons, a pie chart for category distribution, and a recent activity table. Make it fully responsive.",
      },
      {
        id: "user-management",
        label: "User Management",
        description: "User list with roles, permissions, and profile editing",
        prompt:
          "Create a user management system with: a user table (avatar, name, email, role, status, last login), search and filter by role/status, user detail/edit drawer, role assignment, bulk actions (activate/deactivate/delete), and an invite user modal with email input.",
      },
      {
        id: "settings-profile",
        label: "Settings & Profile",
        description: "User profile and application settings pages",
        prompt:
          "Build a settings page with tabs: Profile (avatar upload, name, email, bio), Account (change password, two-factor auth toggle), Notifications (email/push toggles per category), and Appearance (theme toggle dark/light, language selector). Include save/cancel buttons with unsaved changes warning.",
      },
      {
        id: "blog-cms",
        label: "Blog / Content Management",
        description: "Blog post list, editor, and preview",
        prompt:
          "Create a blog content management system with: a post list table (title, author, status, date, actions), a rich text editor page for creating/editing posts with title, category, tags, featured image, and content body. Include a preview mode and publish/draft toggle.",
      },
      {
        id: "chat-messaging",
        label: "Chat / Messaging UI",
        description: "Real-time chat interface with conversations",
        prompt:
          "Build a chat messaging interface with: a left sidebar showing conversation list with avatars, names, last message preview, and unread badges. The main area shows the selected conversation's messages with bubbles, timestamps, and a message input with send button and emoji picker. Include online status indicators.",
      },
    ];

    return res.json({ success: true, templates });
  });

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
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }

    const { prompt, apiId, provider, model } = parseResult.data;
    const result = await GenerateService.generate(
      prompt,
      provider,
      model,
      apiId,
    );
    return res.json(result);
  });

  /**
   * @openapi
   * /api/generate/preview:
   *   post:
   *     tags: [Generate]
   *     summary: Generate UI preview from API spec (simplified input flow)
   *     description: >
   *       Simplified input flow for preview generation. Only requires API specification.
   *       Actions and design can be described with natural language prompts instead of JSON files.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - apiSpec
   *             properties:
   *               apiSpec:
   *                 type: string
   *                 description: OpenAPI specification (YAML or JSON content)
   *               actionsPrompt:
   *                 type: string
   *                 description: Natural language description of desired actions/features
   *               designPrompt:
   *                 type: string
   *                 description: Natural language description of design preferences
   *               customPrompt:
   *                 type: string
   *                 description: Additional custom instructions
   *               provider:
   *                 type: string
   *                 enum: [openai, gemini]
   *                 default: openai
   *               model:
   *                 type: string
   *     responses:
   *       200:
   *         description: Preview generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenerateResponse'
   *       400:
   *         description: Validation error
   */
  static generatePreview = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = GeneratePreviewRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }

    const {
      apiSpec,
      actionsPrompt,
      designPrompt,
      customPrompt,
      provider,
      model,
    } = parseResult.data;
    const result = await GenerateService.generatePreview(
      apiSpec,
      provider,
      model,
      actionsPrompt,
      designPrompt,
      customPrompt,
    );
    return res.json(result);
  });
}
