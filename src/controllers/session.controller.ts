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

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const session = await SessionService.getById(param(req, "id"), developerId);
    return res.json({ success: true, data: session });
  });

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
