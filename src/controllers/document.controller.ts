import { Request, Response, NextFunction } from "express";
import { DocumentService } from "../services/document.service";
import { UpsertDocumentSchema, DocumentTypeEnum } from "../dtos/DocumentDtos";
import { BadRequestError } from "../middlewares/errorHandler";
import type { document_type } from "../generated/prisma";

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

function parseDocType(raw: string): document_type {
  const result = DocumentTypeEnum.safeParse(raw.toUpperCase());
  if (!result.success) {
    throw BadRequestError(
      `Invalid document type: ${raw}. Must be one of: OPENAPI, ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM`,
    );
  }
  return result.data as document_type;
}

export class DocumentController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const docs = await DocumentService.listByProject(param(req, "projectId"), developerId);
    return res.json({ success: true, data: docs });
  });

  static getByType = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const type = parseDocType(param(req, "type"));
    const doc = await DocumentService.getByType(param(req, "projectId"), type, developerId);
    return res.json({ success: true, data: doc });
  });

  static upsert = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const type = parseDocType(param(req, "type"));
    const parseResult = UpsertDocumentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(parseResult.error.issues[0]?.message || "Invalid input");
    }
    const doc = await DocumentService.upsert(
      param(req, "projectId"),
      type,
      developerId,
      parseResult.data,
    );
    return res.json({ success: true, data: doc });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const type = parseDocType(param(req, "type"));
    await DocumentService.delete(param(req, "projectId"), type, developerId);
    return res.status(204).send();
  });
}
