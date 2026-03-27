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
          provider: data.provider as deployment_provider | null,
        }),
        ...(data.deploy_url !== undefined && { deploy_url: data.deploy_url }),
        ...(data.error_message !== undefined && {
          error_message: data.error_message,
        }),
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
    },
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
    },
  ) {
    return prisma.deployments.update({
      where: { id },
      data: {
        status: result.status,
        deploy_url: result.deploy_url ?? null,
        error_message: result.error_message ?? null,
        metadata_json: (result.metadata_json as any) ?? null,
        finished_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.deployments.delete({ where: { id } });
  }

  /**
   * Find active deployment for an API (PENDING or IN_PROGRESS).
   * Used to prevent duplicate deployments.
   * Deployments older than 30 minutes are considered stale and ignored.
   *
   * @param apiId - API ID
   * @returns Active deployment or null
   */
  static findActiveByApiId(apiId: string) {
    const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    const staleDate = new Date(Date.now() - STALE_THRESHOLD_MS);

    return prisma.deployments.findFirst({
      where: {
        api_id: apiId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        created_at: { gte: staleDate },
      },
      orderBy: { created_at: "desc" },
    });
  }

  /**
   * Find the most recent deployment for an API regardless of status.
   * Useful for checking if we can skip creating a new deployment.
   *
   * @param apiId - API ID
   * @returns Latest deployment or null
   */
  static findLatestSuccessfulByApiId(apiId: string) {
    return prisma.deployments.findFirst({
      where: {
        api_id: apiId,
        status: "DEPLOYED",
      },
      orderBy: { finished_at: "desc" },
    });
  }

  /**
   * Count active deployments for an API.
   * Used for duplicate deployment detection.
   *
   * @param apiId - API ID
   * @returns Count of active deployments
   */
  static countActiveByApiId(apiId: string) {
    return prisma.deployments.count({
      where: {
        api_id: apiId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });
  }
}
