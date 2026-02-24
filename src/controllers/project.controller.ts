import { Request, Response, NextFunction } from "express";
import { ProjectService } from "../services/project.service";
import { CreateProjectSchema, UpdateProjectSchema } from "../dtos/ProjectDtos";
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

export class ProjectController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const projects = await ProjectService.list(developerId);
    return res.json({ success: true, data: projects });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const project = await ProjectService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: project });
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = CreateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const project = await ProjectService.create(developerId, parseResult.data);
    return res.status(201).json({ success: true, data: project });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const parseResult = UpdateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const project = await ProjectService.update(param(req, "id"), developerId, parseResult.data);
    return res.json({ success: true, data: project });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    await ProjectService.delete(param(req, "id"), developerId);
    return res.status(204).send();
  });
}
