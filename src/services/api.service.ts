import { ApiRepository } from "../repositories/api.repository";
import { ForbiddenError, NotFoundError } from "../middlewares/errorHandler";
import type { CreateApiRequest, UpdateApiRequest } from "../dtos/ApiDtos";

export class ApiService {
  static async verifyOwnership(apiId: string, developerId: string) {
    const api = await ApiRepository.findById(apiId);
    if (!api) throw NotFoundError("API not found");
    if (api.owner_developer_id !== developerId) throw ForbiddenError("Access denied");
    return api;
  }

  static async list(developerId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      ApiRepository.list(developerId, page, limit),
      ApiRepository.count(developerId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(apiId: string, developerId: string) {
    return this.verifyOwnership(apiId, developerId);
  }

  static async create(developerId: string, data: CreateApiRequest) {
    return ApiRepository.create(developerId, data);
  }

  static async update(apiId: string, developerId: string, data: UpdateApiRequest) {
    await this.verifyOwnership(apiId, developerId);
    return ApiRepository.update(apiId, data);
  }

  static async delete(apiId: string, developerId: string) {
    await this.verifyOwnership(apiId, developerId);
    return ApiRepository.delete(apiId);
  }
}
