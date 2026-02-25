import { GeneratedCodeRepository } from "../repositories/generatedCode.repository";
import { ApiService } from "./api.service";
import { NotFoundError } from "../middlewares/errorHandler";
import type { CreateGeneratedCodeRequest } from "../dtos/GeneratedCodeDtos";

export class GeneratedCodeService {
  static async list(apiId: string, developerId: string, page: number, limit: number) {
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

  static async create(apiId: string, developerId: string, data: CreateGeneratedCodeRequest) {
    await ApiService.verifyOwnership(apiId, developerId);
    return GeneratedCodeRepository.create(apiId, data);
  }

  static async delete(codeId: string, developerId: string) {
    const code = await GeneratedCodeRepository.findById(codeId);
    if (!code) throw NotFoundError("Generated code not found");
    await ApiService.verifyOwnership(code.api_id, developerId);
    return GeneratedCodeRepository.delete(codeId);
  }
}
