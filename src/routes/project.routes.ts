import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import { requireAuth } from "../middlewares/authJwt";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateProjectRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Project name
 *           example: "My Awesome App"
 *         description:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           description: Project description
 *           example: "An AI-powered code generation project"
 *         repo_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Git repository URL
 *           example: "https://github.com/user/repo"
 *         default_branch:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: Default git branch
 *           example: "main"
 *         vercel_project_id:
 *           type: string
 *           maxLength: 200
 *           nullable: true
 *           description: Vercel project ID for deployment
 *           example: "prj_xxxxxxxxxx"
 *     UpdateProjectRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Project name
 *           example: "Updated App Name"
 *         description:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           description: Project description
 *         repo_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Git repository URL
 *         default_branch:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: Default git branch
 *         vercel_project_id:
 *           type: string
 *           maxLength: 200
 *           nullable: true
 *           description: Vercel project ID
 *     ProjectResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Project unique identifier
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         developer_id:
 *           type: string
 *           format: uuid
 *           description: Owner developer ID
 *         name:
 *           type: string
 *           description: Project name
 *           example: "My Awesome App"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Project description
 *         repo_url:
 *           type: string
 *           nullable: true
 *           description: Git repository URL
 *         default_branch:
 *           type: string
 *           nullable: true
 *           description: Default git branch
 *         vercel_project_id:
 *           type: string
 *           nullable: true
 *           description: Vercel project ID
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

export const projectRouter = Router();

// All project routes require authentication
projectRouter.use(requireAuth);

projectRouter.get("/", ProjectController.list);
projectRouter.get("/:id", ProjectController.getById);
projectRouter.post("/", ProjectController.create);
projectRouter.put("/:id", ProjectController.update);
projectRouter.delete("/:id", ProjectController.delete);
