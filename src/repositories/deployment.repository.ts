import { prisma } from "../clients/prisma";
import type {
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
} from "../dtos/DeploymentDtos";
import type {
  deployment_environment,
  deployment_status,
  deployment_provider,
} from "../generated/prisma/enums";

export class DeploymentRepository {
  static listByApi(apiId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.deployments.findMany({
      where: { api_id: apiId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  }

  static countByApi(apiId: string) {
    return prisma.deployments.count({ where: { api_id: apiId } });
  }

  static findById(id: string) {
    return prisma.deployments.findUnique({ where: { id } });
  }

  static findByApiAndStatus(apiId: string, status: deployment_status) {
    return prisma.deployments.findFirst({
      where: { api_id: apiId, status },
      orderBy: { created_at: "desc" },
    });
  }

  static findLatestByApi(apiId: string) {
    return prisma.deployments.findFirst({
      where: { api_id: apiId },
      orderBy: { created_at: "desc" },
    });
  }

  static create(apiId: string, data: CreateDeploymentRequest) {
    return prisma.deployments.create({
      data: {
        api_id: apiId,
        environment: data.environment as deployment_environment,
        status: data.status as deployment_status,
        provider: (data.provider as deployment_provider) ?? null,
        deploy_url: data.deploy_url ?? null,
        error_message: data.error_message ?? null,
        metadata_json: (data.metadata_json as any) ?? null,
        generation_session_id: data.generation_session_id ?? null,
      },
    });
  }

  static update(id: string, data: UpdateDeploymentRequest) {
    return prisma.deployments.update({
      where: { id },
      data: {
        ...(data.environment !== undefined && {
          environment: data.environment as deployment_environment,
        }),
        ...(data.status !== undefined && {
          status: data.status as deployment_status,
        }),
        ...(data.provider !== undefined && { 
          provider: data.provider as deployment_provider | null 
        }),
        ...(data.deploy_url !== undefined && { deploy_url: data.deploy_url }),
        ...(data.error_message !== undefined && { error_message: data.error_message }),
        ...(data.metadata_json !== undefined && {
          metadata_json: data.metadata_json as any,
        }),
        updated_at: new Date(),
      },
    });
  }

  static updateStatus(
    id: string,
    status: deployment_status,
    additionalData?: {
      deploy_url?: string | null;
      error_message?: string | null;
      metadata_json?: Record<string, unknown> | null;
      started_at?: Date | null;
      finished_at?: Date | null;
    }
  ) {
    return prisma.deployments.update({
      where: { id },
      data: {
        status,
        deploy_url: additionalData?.deploy_url,
        error_message: additionalData?.error_message,
        metadata_json: additionalData?.metadata_json as any,
        started_at: additionalData?.started_at,
        finished_at: additionalData?.finished_at,
        updated_at: new Date(),
      },
    });
  }

  static setDeploymentResult(
    id: string,
    result: {
      status: deployment_status;
      deploy_url?: string | null;
      error_message?: string | null;
      metadata_json?: Record<string, unknown> | null;
    }
  ) {
    return prisma.deployments.update({
      where: { id },
      data: {
        status: result.status,
        deploy_url: result.deploy_url ?? null,
        error_message: result.error_message ?? null,
        metadata_json: result.metadata_json as any ?? null,
        finished_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.deployments.delete({ where: { id } });
  }
}
