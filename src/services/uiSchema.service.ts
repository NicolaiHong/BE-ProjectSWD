import { UiSchemaRepository } from "../repositories/uiSchema.repository";
import { ApiService } from "./api.service";
import { NotFoundError } from "../middlewares/errorHandler";
import type { CreateUiSchemaRequest, UpdateUiSchemaRequest } from "../dtos/UiSchemaDtos";

export class UiSchemaService {
  static async list(apiId: string, developerId: string, page: number, limit: number) {
    await ApiService.verifyOwnership(apiId, developerId);
    const [data, total] = await Promise.all([
      UiSchemaRepository.listByApi(apiId, page, limit),
      UiSchemaRepository.countByApi(apiId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(schemaId: string, developerId: string) {
    const schema = await UiSchemaRepository.findById(schemaId);
    if (!schema) throw NotFoundError("UI Schema not found");
    await ApiService.verifyOwnership(schema.api_id, developerId);
    return schema;
  }

  static async create(apiId: string, developerId: string, data: CreateUiSchemaRequest) {
    await ApiService.verifyOwnership(apiId, developerId);
    return UiSchemaRepository.create(apiId, data);
  }

  static async update(schemaId: string, developerId: string, data: UpdateUiSchemaRequest) {
    const schema = await UiSchemaRepository.findById(schemaId);
    if (!schema) throw NotFoundError("UI Schema not found");
    await ApiService.verifyOwnership(schema.api_id, developerId);
    return UiSchemaRepository.update(schemaId, data);
  }

  static async delete(schemaId: string, developerId: string) {
    const schema = await UiSchemaRepository.findById(schemaId);
    if (!schema) throw NotFoundError("UI Schema not found");
    await ApiService.verifyOwnership(schema.api_id, developerId);
    return UiSchemaRepository.delete(schemaId);
  }
}
