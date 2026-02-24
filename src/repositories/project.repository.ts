import { prisma } from "../clients/prisma";
import type { CreateProjectRequest, UpdateProjectRequest } from "../dtos/ProjectDtos";

export class ProjectRepository {
  static list(developerId: string) {
    return prisma.projects.findMany({
      where: { developer_id: developerId },
      orderBy: { created_at: "desc" },
      include: { _count: { select: { project_documents: true, generation_sessions: true } } },
    });
  }

  static findById(id: string) {
    return prisma.projects.findUnique({
      where: { id },
      include: { _count: { select: { project_documents: true, generation_sessions: true } } },
    });
  }

  static create(developerId: string, data: CreateProjectRequest) {
    return prisma.projects.create({
      data: {
        developer_id: developerId,
        name: data.name,
        description: data.description ?? null,
        repo_url: data.repo_url ?? null,
        default_branch: data.default_branch ?? null,
        vercel_project_id: data.vercel_project_id ?? null,
      },
    });
  }

  static update(id: string, data: UpdateProjectRequest) {
    return prisma.projects.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.projects.delete({ where: { id } });
  }
}
