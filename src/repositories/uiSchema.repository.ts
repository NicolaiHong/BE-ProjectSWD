import { prisma } from "../clients/prisma";
import type { CreateUiSchemaRequest, UpdateUiSchemaRequest } from "../dtos/UiSchemaDtos";

export class UiSchemaRepository {
  static listByApi(apiId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.ui_schemas.findMany({
      where: { api_id: apiId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  }

  static countByApi(apiId: string) {
    return prisma.ui_schemas.count({ where: { api_id: apiId } });
  }

  static findById(id: string) {
    return prisma.ui_schemas.findUnique({ where: { id } });
  }

  static create(apiId: string, data: CreateUiSchemaRequest) {
    return prisma.ui_schemas.create({
      data: {
        api_id: apiId,
        name: data.name,
        schema_json: data.schema_json as any,
      },
    });
  }

  static update(id: string, data: UpdateUiSchemaRequest) {
    return prisma.ui_schemas.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.schema_json !== undefined && { schema_json: data.schema_json as any }),
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.ui_schemas.delete({ where: { id } });
  }
}
