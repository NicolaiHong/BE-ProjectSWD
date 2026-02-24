import { ProjectRepository } from "../repositories/project.repository";
import { ForbiddenError, NotFoundError } from "../middlewares/errorHandler";
import type { CreateProjectRequest, UpdateProjectRequest } from "../dtos/ProjectDtos";

export class ProjectService {
  static async list(developerId: string) {
    return ProjectRepository.list(developerId);
  }

  static async getById(projectId: string, developerId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw NotFoundError("Project not found");
    if (project.developer_id !== developerId) throw ForbiddenError("Access denied");
    return project;
  }

  static async create(developerId: string, data: CreateProjectRequest) {
    return ProjectRepository.create(developerId, data);
  }

  static async update(projectId: string, developerId: string, data: UpdateProjectRequest) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw NotFoundError("Project not found");
    if (project.developer_id !== developerId) throw ForbiddenError("Access denied");
    return ProjectRepository.update(projectId, data);
  }

  static async delete(projectId: string, developerId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw NotFoundError("Project not found");
    if (project.developer_id !== developerId) throw ForbiddenError("Access denied");
    return ProjectRepository.delete(projectId);
  }
}
