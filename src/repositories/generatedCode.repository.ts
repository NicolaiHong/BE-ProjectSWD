import { prisma } from "../clients/prisma";
import type { CreateGeneratedCodeRequest } from "../dtos/GeneratedCodeDtos";

export class GeneratedCodeRepository {
  static listByApi(apiId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.generated_codes.findMany({
      where: { api_id: apiId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  }

  static countByApi(apiId: string) {
    return prisma.generated_codes.count({ where: { api_id: apiId } });
  }

  static findById(id: string) {
    return prisma.generated_codes.findUnique({ where: { id } });
  }

  static create(apiId: string, data: CreateGeneratedCodeRequest) {
    return prisma.generated_codes.create({
      data: {
        api_id: apiId,
        file_path: data.file_path,
        content: data.content,
        language: data.language ?? null,
        generation_session_id: data.generation_session_id ?? null,
      },
    });
  }

  static bulkCreate(
    apiId: string,
    items: { file_path: string; content: string; language?: string | null; generation_session_id?: string | null }[],
  ) {
    return prisma.generated_codes.createMany({
      data: items.map((item) => ({
        api_id: apiId,
        file_path: item.file_path,
        content: item.content,
        language: item.language ?? null,
        generation_session_id: item.generation_session_id ?? null,
      })),
    });
  }

  static delete(id: string) {
    return prisma.generated_codes.delete({ where: { id } });
  }
}
