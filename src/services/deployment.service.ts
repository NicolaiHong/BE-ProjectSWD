import { DeploymentRepository } from "../repositories/deployment.repository";
import { ApiService } from "./api.service";
import { NotFoundError } from "../middlewares/errorHandler";
import type { CreateDeploymentRequest, UpdateDeploymentRequest } from "../dtos/DeploymentDtos";

export class DeploymentService {
  static async list(apiId: string, developerId: string, page: number, limit: number) {
    await ApiService.verifyOwnership(apiId, developerId);
    const [data, total] = await Promise.all([
      DeploymentRepository.listByApi(apiId, page, limit),
      DeploymentRepository.countByApi(apiId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    return deployment;
  }

  static async create(apiId: string, developerId: string, data: CreateDeploymentRequest) {
    await ApiService.verifyOwnership(apiId, developerId);
    return DeploymentRepository.create(apiId, data);
  }

  static async update(deploymentId: string, developerId: string, data: UpdateDeploymentRequest) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    return DeploymentRepository.update(deploymentId, data);
  }

  static async delete(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    return DeploymentRepository.delete(deploymentId);
  }
}
