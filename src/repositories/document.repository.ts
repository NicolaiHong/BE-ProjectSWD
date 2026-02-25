import { prisma } from "../clients/prisma";
import type { document_type } from "../generated/prisma/enums";

export class DocumentRepository {
  static listByProject(projectId: string) {
    return prisma.project_documents.findMany({
      where: { project_id: projectId },
      orderBy: { type: "asc" },
    });
  }

  static findByProjectAndType(projectId: string, type: document_type) {
    return prisma.project_documents.findUnique({
      where: { project_id_type: { project_id: projectId, type } },
    });
  }

  static upsert(
    projectId: string,
    type: document_type,
    data: {
      name: string;
      content: string;
      content_type: string | null;
      sha256: string;
    },
  ) {
    return prisma.project_documents.upsert({
      where: { project_id_type: { project_id: projectId, type } },
      create: {
        project_id: projectId,
        type,
        name: data.name,
        content: data.content,
        content_type: data.content_type,
        sha256: data.sha256,
      },
      update: {
        name: data.name,
        content: data.content,
        content_type: data.content_type,
        sha256: data.sha256,
        updated_at: new Date(),
      },
    });
  }

  static delete(projectId: string, type: document_type) {
    return prisma.project_documents.delete({
      where: { project_id_type: { project_id: projectId, type } },
    });
  }
}
