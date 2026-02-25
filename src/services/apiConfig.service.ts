import { ApiConfigRepository } from "../repositories/apiConfig.repository";
import { ApiService } from "./api.service";
import { NotFoundError } from "../middlewares/errorHandler";
import type { CreateApiConfigRequest, UpdateApiConfigRequest } from "../dtos/ApiConfigDtos";

export class ApiConfigService {
  static async list(apiId: string, developerId: string, page: number, limit: number) {
    await ApiService.verifyOwnership(apiId, developerId);
    const [data, total] = await Promise.all([
      ApiConfigRepository.listByApi(apiId, page, limit),
      ApiConfigRepository.countByApi(apiId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(configId: string, developerId: string) {
    const config = await ApiConfigRepository.findById(configId);
    if (!config) throw NotFoundError("Config not found");
    await ApiService.verifyOwnership(config.api_id, developerId);
    return config;
  }

  static async create(apiId: string, developerId: string, data: CreateApiConfigRequest) {
    await ApiService.verifyOwnership(apiId, developerId);
    return ApiConfigRepository.create(apiId, data);
  }

  static async update(configId: string, developerId: string, data: UpdateApiConfigRequest) {
    const config = await ApiConfigRepository.findById(configId);
    if (!config) throw NotFoundError("Config not found");
    await ApiService.verifyOwnership(config.api_id, developerId);
    return ApiConfigRepository.update(configId, data);
  }

  static async delete(configId: string, developerId: string) {
    const config = await ApiConfigRepository.findById(configId);
    if (!config) throw NotFoundError("Config not found");
    await ApiService.verifyOwnership(config.api_id, developerId);
    return ApiConfigRepository.delete(configId);
  }
}
