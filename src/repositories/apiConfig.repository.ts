import { prisma } from "../clients/prisma";
import type { CreateApiConfigRequest, UpdateApiConfigRequest } from "../dtos/ApiConfigDtos";

export class ApiConfigRepository {
  static listByApi(apiId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.api_configs.findMany({
      where: { api_id: apiId },
      orderBy: { key: "asc" },
      skip,
      take: limit,
    });
  }

  static countByApi(apiId: string) {
    return prisma.api_configs.count({ where: { api_id: apiId } });
  }

  static findById(id: string) {
    return prisma.api_configs.findUnique({ where: { id } });
  }

  static create(apiId: string, data: CreateApiConfigRequest) {
    return prisma.api_configs.create({
      data: {
        api_id: apiId,
        key: data.key,
        value: data.value,
        is_secret: data.is_secret,
      },
    });
  }

  static update(id: string, data: UpdateApiConfigRequest) {
    return prisma.api_configs.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  static delete(id: string) {
    return prisma.api_configs.delete({ where: { id } });
  }
}
