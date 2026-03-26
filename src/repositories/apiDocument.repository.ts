import { prisma } from "../clients/prisma";
import type { document_type } from "../generated/prisma/enums";

export class ApiDocumentRepository {
  static listByApi(apiId: string) {
    return prisma.api_documents.findMany({
      where: { api_id: apiId },
      orderBy: { type: "asc" },
    });
  }

  static findByApiAndType(apiId: string, type: document_type) {
    return prisma.api_documents.findUnique({
      where: { api_id_type: { api_id: apiId, type } },
    });
  }

  static upsert(
    apiId: string,
    type: document_type,
    data: {
      name: string;
      content: string;
      content_type: string | null;
      sha256: string;
    },
  ) {
    return prisma.api_documents.upsert({
      where: { api_id_type: { api_id: apiId, type } },
      create: {
        api_id: apiId,
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

  static delete(apiId: string, type: document_type) {
    return prisma.api_documents.delete({
      where: { api_id_type: { api_id: apiId, type } },
    });
  }
}
