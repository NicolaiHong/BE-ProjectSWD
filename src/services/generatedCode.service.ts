import { GeneratedCodeRepository } from "../repositories/generatedCode.repository";
import { ApiService } from "./api.service";
import { NotFoundError } from "../middlewares/errorHandler";
import type {
  CreateGeneratedCodeRequest,
  GeneratedCodeFilters,
} from "../dtos/GeneratedCodeDtos";

export class GeneratedCodeService {
  static async list(
    apiId: string,
    developerId: string,
    page: number,
    limit: number,
  ) {
    await ApiService.verifyOwnership(apiId, developerId);
    const [data, total] = await Promise.all([
      GeneratedCodeRepository.listByApi(apiId, page, limit),
      GeneratedCodeRepository.countByApi(apiId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(codeId: string, developerId: string) {
    const code = await GeneratedCodeRepository.findById(codeId);
    if (!code) throw NotFoundError("Generated code not found");
    await ApiService.verifyOwnership(code.api_id, developerId);
    return code;
  }

  static async create(
    apiId: string,
    developerId: string,
    data: CreateGeneratedCodeRequest,
  ) {
    await ApiService.verifyOwnership(apiId, developerId);
    return GeneratedCodeRepository.create(apiId, data);
  }

  static async delete(codeId: string, developerId: string) {
    const code = await GeneratedCodeRepository.findById(codeId);
    if (!code) throw NotFoundError("Generated code not found");
    await ApiService.verifyOwnership(code.api_id, developerId);
    return GeneratedCodeRepository.delete(codeId);
  }

  // Global methods for Code History feature
  static async listAll(
    developerId: string,
    page: number,
    limit: number,
    filters?: GeneratedCodeFilters,
  ) {
    if (filters?.apiId) {
      await ApiService.verifyOwnership(filters.apiId, developerId);
    }

    const [data, total] = await Promise.all([
      GeneratedCodeRepository.listByDeveloper(
        developerId,
        page,
        limit,
        filters,
      ),
      GeneratedCodeRepository.countByDeveloper(developerId, filters),
    ]);

    return {
      data: data.map((code) => ({
        ...code,
        api_name: code.apis?.name || "Unknown API",
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getByIdGlobal(codeId: string, developerId: string) {
    const code = await GeneratedCodeRepository.findByIdWithApi(codeId);
    if (!code) throw NotFoundError("Generated code not found");
    if (code.apis?.owner_developer_id !== developerId) {
      throw NotFoundError("Generated code not found");
    }
    return {
      ...code,
      api_name: code.apis?.name || "Unknown API",
    };
  }

  static async deleteGlobal(codeId: string, developerId: string) {
    const code = await GeneratedCodeRepository.findByIdWithApi(codeId);
    if (!code) throw NotFoundError("Generated code not found");
    if (code.apis?.owner_developer_id !== developerId) {
      throw NotFoundError("Generated code not found");
    }
    return GeneratedCodeRepository.delete(codeId);
  }
}
