import { DeploymentRepository } from "../repositories/deployment.repository";
import { ApiRepository } from "../repositories/api.repository";
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
    const deployment = await DeploymentRepository.create(apiId, data);
    // Update workflow state to DEPLOYING
    await ApiRepository.updateWorkflowState(apiId, "DEPLOYING").catch(() => {});
    return deployment;
  }

  static async update(deploymentId: string, developerId: string, data: UpdateDeploymentRequest) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    const updated = await DeploymentRepository.update(deploymentId, data);
    // Auto-transition workflow state on deployment status change
    if (data.status === "DEPLOYED") {
      await ApiRepository.updateWorkflowState(deployment.api_id, "DEPLOYED").catch(() => {});
    } else if (data.status === "FAILED") {
      await ApiRepository.updateWorkflowState(deployment.api_id, "FAILED").catch(() => {});
    }
    return updated;
  }

  static async delete(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    return DeploymentRepository.delete(deploymentId);
  }
}
