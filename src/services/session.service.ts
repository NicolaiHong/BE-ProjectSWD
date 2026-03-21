import { SessionRepository } from "../repositories/session.repository";
import { DocumentRepository } from "../repositories/document.repository";
import { ApiDocumentRepository } from "../repositories/apiDocument.repository";
import { ProjectRepository } from "../repositories/project.repository";
import { ApiRepository } from "../repositories/api.repository";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../middlewares/errorHandler";
import type { gen_status, generation_mode } from "../generated/prisma/enums";
import type {
  RunGenerationRequest,
  RunApiGenerationRequest,
} from "../dtos/SessionDtos";

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

    // Verify ownership via project or API
    if (session.project_id) {
      await this.verifyOwnership(session.project_id, developerId);
    } else if (session.api_id) {
      await this.verifyApiOwnership(session.api_id, developerId);
    } else {
      throw ForbiddenError("Session has no ownership context");
    }
    return session;
  }

  static async deleteSession(sessionId: string, developerId: string) {
    const session = await SessionRepository.findById(sessionId);
    if (!session) throw NotFoundError("Session not found");

    // Verify ownership via project or API
    if (session.project_id) {
      await this.verifyOwnership(session.project_id, developerId);
    } else if (session.api_id) {
      await this.verifyApiOwnership(session.api_id, developerId);
    } else {
      throw ForbiddenError("Session has no ownership context");
    }
    await SessionRepository.deleteById(sessionId);
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
      mode: data.mode as generation_mode,
      api_id: data.api_id ?? null,
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

      const { Orchestrator } = await import("../ai/orchestrator");
      const result = await Orchestrator.run(sessionId, project, docs, data);

      const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
      const filesPayload = result.changes
        .filter((c) => c.action !== "delete")
        .map((c) => ({ path: c.path, content: c.content, action: c.action }));
      const envelope = JSON.stringify({
        summary_md: result.summary_md,
        files: filesPayload,
      });
      const outputValue =
        envelope.length <= MAX_OUTPUT_BYTES ? envelope : result.summary_md;

      await SessionRepository.setOutput(sessionId, {
        output_summary_md: outputValue,
        repo_commit_sha: result.commit_sha ?? null,
        pr_url: result.pr_url ?? null,
      });
      await SessionRepository.updateStatus(sessionId, "SUCCEEDED");

      // Update API workflow state after successful generation
      if (data.api_id) {
        const nextState =
          data.mode === "PREVIEW" ? "UI_GENERATED" : "CODE_GENERATED";
        await ApiRepository.updateWorkflowState(data.api_id, nextState as any);
      }
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

      // Update API workflow state on failure
      if (data.api_id) {
        await ApiRepository.updateWorkflowState(
          data.api_id,
          "FAILED" as any,
        ).catch(() => {});
      }
    }
  }

  // ===== API-Centric Methods =====

  private static async verifyApiOwnership(apiId: string, developerId: string) {
    const api = await ApiRepository.findById(apiId);
    if (!api) throw NotFoundError("API not found");
    if (api.owner_developer_id !== developerId)
      throw ForbiddenError("Access denied");
    return api;
  }

  static async getByApiAndId(
    apiId: string,
    sessionId: string,
    developerId: string,
  ) {
    await this.verifyApiOwnership(apiId, developerId);
    const session = await SessionRepository.findByApiAndId(apiId, sessionId);
    if (!session) throw NotFoundError("Session not found");
    return session;
  }

  static async runApiGeneration(
    apiId: string,
    developerId: string,
    data: RunApiGenerationRequest,
  ) {
    const api = await this.verifyApiOwnership(apiId, developerId);

    // Get documents - from project if linked, otherwise from api_documents
    let docs: any[];
    let project: any | null = null;

    if (api.project_id) {
      project = await ProjectRepository.findById(api.project_id);
      docs = await DocumentRepository.listByProject(api.project_id);
    } else {
      docs = await ApiDocumentRepository.listByApi(apiId);
    }

    // Validate required documents
    const docTypes = docs.map((d) => d.type);
    const requiredTypes = [
      "OPENAPI",
      "ENTITY_SCHEMA",
      "ACTION_SPEC",
      "DESIGN_SYSTEM",
    ] as const;
    const missing = requiredTypes.filter((t) => !docTypes.includes(t));
    if (missing.length > 0) {
      const hint = api.project_id
        ? "Upload documents to the linked project."
        : "Upload documents directly to this API using PUT /api/apis/:id/documents/:type";
      throw BadRequestError(
        `Missing required documents: ${missing.join(", ")}. ${hint}`,
      );
    }

    // Build SHA map
    const shaMap: Record<string, string | null> = {};
    for (const doc of docs) {
      shaMap[doc.type] = doc.sha256;
    }

    // Create session (project_id can be null for API-only workflows)
    const session = await SessionRepository.create({
      project_id: api.project_id ?? null,
      api_id: apiId,
      provider: data.provider,
      model: data.model,
      mode: data.mode as generation_mode,
      openapi_sha256: shaMap["OPENAPI"] ?? null,
      entity_schema_sha256: shaMap["ENTITY_SCHEMA"] ?? null,
      action_spec_sha256: shaMap["ACTION_SPEC"] ?? null,
      design_system_sha256: shaMap["DESIGN_SYSTEM"] ?? null,
    });

    // Execute async generation
    this.executeApiGeneration(session.id, project, api, docs, data).catch(
      (err) => {
        console.error(
          `[SessionService] Async API generation failed for session ${session.id}:`,
          err,
        );
      },
    );

    return session;
  }

  private static async executeApiGeneration(
    sessionId: string,
    project: any | null,
    api: any,
    docs: any[],
    data: RunApiGenerationRequest,
  ) {
    try {
      await SessionRepository.updateStatus(sessionId, "RUNNING");

      const { Orchestrator } = await import("../ai/orchestrator");
      const result = await Orchestrator.runForApi(
        sessionId,
        project,
        api,
        docs,
        data,
      );

      const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
      const filesPayload = result.changes
        .filter((c) => c.action !== "delete")
        .map((c) => ({ path: c.path, content: c.content, action: c.action }));
      const envelope = JSON.stringify({
        summary_md: result.summary_md,
        files: filesPayload,
      });
      const outputValue =
        envelope.length <= MAX_OUTPUT_BYTES ? envelope : result.summary_md;

      await SessionRepository.setOutput(sessionId, {
        output_summary_md: outputValue,
        repo_commit_sha: result.commit_sha ?? null,
        pr_url: result.pr_url ?? null,
      });
      await SessionRepository.updateStatus(sessionId, "SUCCEEDED");

      // Update API workflow state after successful generation
      const nextState =
        data.mode === "PREVIEW" ? "UI_GENERATED" : "CODE_GENERATED";
      await ApiRepository.updateWorkflowState(api.id, nextState as any);
    } catch (err: any) {
      console.error(
        `[SessionService] API generation error for session ${sessionId}:`,
        err,
      );
      await SessionRepository.updateStatus(
        sessionId,
        "FAILED",
        err.message || "Unknown error during generation",
      );

      // Update API workflow state on failure
      await ApiRepository.updateWorkflowState(api.id, "FAILED" as any).catch(
        () => {},
      );
    }
  }
}
