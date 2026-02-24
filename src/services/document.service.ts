import { DocumentRepository } from "../repositories/document.repository";
import { ProjectRepository } from "../repositories/project.repository";
import { ForbiddenError, NotFoundError } from "../middlewares/errorHandler";
import { sha256 } from "../utils/tokenHash";
import type { document_type } from "../generated/prisma";
import type { UpsertDocumentRequest } from "../dtos/DocumentDtos";

export class DocumentService {
  private static async verifyOwnership(projectId: string, developerId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw NotFoundError("Project not found");
    if (project.developer_id !== developerId) throw ForbiddenError("Access denied");
    return project;
  }

  static async listByProject(projectId: string, developerId: string) {
    await this.verifyOwnership(projectId, developerId);
    return DocumentRepository.listByProject(projectId);
  }

  static async getByType(projectId: string, type: document_type, developerId: string) {
    await this.verifyOwnership(projectId, developerId);
    const doc = await DocumentRepository.findByProjectAndType(projectId, type);
    if (!doc) throw NotFoundError(`Document of type ${type} not found`);
    return doc;
  }

  static async upsert(
    projectId: string,
    type: document_type,
    developerId: string,
    data: UpsertDocumentRequest,
  ) {
    await this.verifyOwnership(projectId, developerId);
    const contentHash = sha256(data.content);
    return DocumentRepository.upsert(projectId, type, {
      name: data.name,
      content: data.content,
      content_type: data.content_type ?? null,
      sha256: contentHash,
    });
  }

  static async delete(projectId: string, type: document_type, developerId: string) {
    await this.verifyOwnership(projectId, developerId);
    const doc = await DocumentRepository.findByProjectAndType(projectId, type);
    if (!doc) throw NotFoundError(`Document of type ${type} not found`);
    return DocumentRepository.delete(projectId, type);
  }
}
