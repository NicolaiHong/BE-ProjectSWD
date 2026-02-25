import { prisma } from "../clients/prisma";
import type { CreateDeploymentRequest, UpdateDeploymentRequest } from "../dtos/DeploymentDtos";
import type { deployment_environment, deployment_status } from "../generated/prisma";

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

  static create(apiId: string, data: CreateDeploymentRequest) {
    return prisma.deployments.create({
      data: {
        api_id: apiId,
        environment: data.environment as deployment_environment,
        status: data.status as deployment_status,
        provider: data.provider ?? null,
        metadata_json: data.metadata_json as any ?? null,
      },
    });
  }

  static update(id: string, data: UpdateDeploymentRequest) {
    return prisma.deployments.update({
      where: { id },
      data: {
        ...(data.environment !== undefined && { environment: data.environment as deployment_environment }),
        ...(data.status !== undefined && { status: data.status as deployment_status }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.metadata_json !== undefined && { metadata_json: data.metadata_json as any }),
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.deployments.delete({ where: { id } });
  }
}
