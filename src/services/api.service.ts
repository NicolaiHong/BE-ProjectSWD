import { ApiRepository } from "../repositories/api.repository";
import { SessionRepository } from "../repositories/session.repository";
import { ForbiddenError, NotFoundError, BadRequestError } from "../middlewares/errorHandler";
import type { CreateApiRequest, UpdateApiRequest } from "../dtos/ApiDtos";
import type { workflow_state, generation_mode } from "../generated/prisma/enums";

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

  static async updateWorkflowState(
    apiId: string,
    developerId: string,
    state: workflow_state,
  ) {
    await this.verifyOwnership(apiId, developerId);
    return ApiRepository.updateWorkflowState(apiId, state);
  }

  static async markReadyToDeploy(apiId: string, developerId: string) {
    const api = await this.verifyOwnership(apiId, developerId);
    
    // Idempotent: if already ready, return current state without error
    if (api.workflow_state === "READY_TO_DEPLOY") {
      return api;
    }
    
    // Only allow transition from CODE_GENERATED
    if (api.workflow_state !== "CODE_GENERATED") {
      throw BadRequestError(
        `Cannot mark as ready: current state is "${api.workflow_state ?? "null"}". ` +
          "Full source code must be generated first (state must be CODE_GENERATED).",
      );
    }
    return ApiRepository.updateWorkflowState(apiId, "READY_TO_DEPLOY");
  }

  static async listSessions(
    apiId: string,
    developerId: string,
    mode?: generation_mode,
  ) {
    await this.verifyOwnership(apiId, developerId);
    return SessionRepository.listByApi(apiId, mode);
  }
}
