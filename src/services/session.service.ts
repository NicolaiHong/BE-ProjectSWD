import { SessionRepository } from "../repositories/session.repository";
import { DocumentRepository } from "../repositories/document.repository";
import { ProjectRepository } from "../repositories/project.repository";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../middlewares/errorHandler";
import type { gen_status } from "../generated/prisma";
import type { RunGenerationRequest } from "../dtos/SessionDtos";

export class SessionService {
  private static async verifyOwnership(projectId: string, developerId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw NotFoundError("Project not found");
    if (project.developer_id !== developerId)
      throw ForbiddenError("Access denied");
    return project;
  }

  static async listByProject(
    projectId: string,
    developerId: string,
    status?: gen_status,
  ) {
    await this.verifyOwnership(projectId, developerId);
    return SessionRepository.listByProject(projectId, status);
  }

  static async getById(sessionId: string, developerId: string) {
    const session = await SessionRepository.findById(sessionId);
    if (!session) throw NotFoundError("Session not found");

    await this.verifyOwnership(session.project_id, developerId);
    return session;
  }

  static async runGeneration(
    projectId: string,
    developerId: string,
    data: RunGenerationRequest,
  ) {
    const project = await this.verifyOwnership(projectId, developerId);

    const docs = await DocumentRepository.listByProject(projectId);
    const docTypes = docs.map((d) => d.type);
    const requiredTypes = [
      "OPENAPI",
      "ENTITY_SCHEMA",
      "ACTION_SPEC",
      "DESIGN_SYSTEM",
    ] as const;
    const missing = requiredTypes.filter((t) => !docTypes.includes(t));
    if (missing.length > 0) {
      throw BadRequestError(
        `Missing required documents: ${missing.join(", ")}. All 4 document types must be uploaded before running generation.`,
      );
    }

    const shaMap: Record<string, string | null> = {};
    for (const doc of docs) {
      shaMap[doc.type] = doc.sha256;
    }

    const session = await SessionRepository.create({
      project_id: projectId,
      provider: data.provider,
      model: data.model,
      openapi_sha256: shaMap["OPENAPI"] ?? null,
      entity_schema_sha256: shaMap["ENTITY_SCHEMA"] ?? null,
      action_spec_sha256: shaMap["ACTION_SPEC"] ?? null,
      design_system_sha256: shaMap["DESIGN_SYSTEM"] ?? null,
    });

    this.executeGeneration(session.id, project, docs, data).catch((err) => {
      console.error(
        `[SessionService] Async generation failed for session ${session.id}:`,
        err,
      );
    });

    return session;
  }

  private static async executeGeneration(
    sessionId: string,
    project: any,
    docs: any[],
    data: RunGenerationRequest,
  ) {
    try {
      await SessionRepository.updateStatus(sessionId, "RUNNING");

      const { Orchestrator } = await import("../ai/orchestrator.js");
      const result = await Orchestrator.run(sessionId, project, docs, data);

      await SessionRepository.setOutput(sessionId, {
        output_summary_md: result.summary_md,
        repo_commit_sha: result.commit_sha ?? null,
        pr_url: result.pr_url ?? null,
      });
      await SessionRepository.updateStatus(sessionId, "SUCCEEDED");
    } catch (err: any) {
      console.error(
        `[SessionService] Generation error for session ${sessionId}:`,
        err,
      );
      await SessionRepository.updateStatus(
        sessionId,
        "FAILED",
        err.message || "Unknown error during generation",
      );
    }
  }
}
