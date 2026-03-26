import { prisma } from "../clients/prisma";
import type { CreateApiRequest, UpdateApiRequest } from "../dtos/ApiDtos";
import type { api_status, workflow_state } from "../generated/prisma/enums";

export class ApiRepository {
  static list(developerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.apis.findMany({
      where: { owner_developer_id: developerId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            api_configs: true,
            ui_schemas: true,
            generated_codes: true,
            deployments: true,
          },
        },
      },
    });
  }

  static count(developerId: string) {
    return prisma.apis.count({
      where: { owner_developer_id: developerId },
    });
  }

  static findById(id: string) {
    return prisma.apis.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            api_configs: true,
            ui_schemas: true,
            generated_codes: true,
            deployments: true,
          },
        },
      },
    });
  }

  static create(developerId: string, data: CreateApiRequest) {
    return prisma.apis.create({
      data: {
        owner_developer_id: developerId,
        name: data.name,
        description: data.description ?? null,
        base_url: data.base_url ?? null,
        version: data.version ?? "1.0.0",
        project_id: data.project_id ?? null,
        status: (data.status as api_status) ?? "ACTIVE",
      },
    });
  }

  static update(id: string, data: UpdateApiRequest) {
    return prisma.apis.update({
      where: { id },
      data: {
        ...data,
        status: data.status as api_status | undefined,
        workflow_state: data.workflow_state as workflow_state | undefined,
        updated_at: new Date(),
      },
    });
  }

  static updateWorkflowState(id: string, state: workflow_state) {
    return prisma.apis.update({
      where: { id },
      data: {
        workflow_state: state,
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.apis.delete({ where: { id } });
  }
}
