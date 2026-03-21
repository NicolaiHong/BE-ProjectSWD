import { prisma } from "../clients/prisma";
import type { gen_status, generation_mode } from "../generated/prisma/enums";

export class SessionRepository {
  static listByProject(projectId: string, status?: gen_status) {
    return prisma.generation_sessions.findMany({
      where: {
        project_id: projectId,
        ...(status ? { status } : {}),
      },
      orderBy: { created_at: "desc" },
    });
  }

  static findById(id: string) {
    return prisma.generation_sessions.findUnique({ where: { id } });
  }

  static create(data: {
    project_id?: string | null;
    provider: string;
    model: string;
    mode?: generation_mode;
    api_id?: string | null;
    openapi_sha256: string | null;
    entity_schema_sha256: string | null;
    action_spec_sha256: string | null;
    design_system_sha256: string | null;
  }) {
    return prisma.generation_sessions.create({
      data: {
        ...data,
        project_id: data.project_id ?? null,
        mode: data.mode ?? "FULL_SOURCE",
        api_id: data.api_id ?? null,
        status: "QUEUED",
      },
    });
  }

  static findByApiAndId(apiId: string, sessionId: string) {
    return prisma.generation_sessions.findFirst({
      where: { id: sessionId, api_id: apiId },
    });
  }

  static listByApi(apiId: string, mode?: generation_mode) {
    return prisma.generation_sessions.findMany({
      where: {
        api_id: apiId,
        ...(mode ? { mode } : {}),
      },
      orderBy: { created_at: "desc" },
    });
  }

  static updateStatus(
    id: string,
    status: gen_status,
    errorMessage?: string | null,
  ) {
    return prisma.generation_sessions.update({
      where: { id },
      data: {
        status,
        error_message: errorMessage ?? null,
        ...(status === "SUCCEEDED" || status === "FAILED"
          ? { finished_at: new Date() }
          : {}),
      },
    });
  }

  static setOutput(
    id: string,
    data: {
      output_summary_md?: string | null;
      repo_commit_sha?: string | null;
      pr_url?: string | null;
      vercel_deploy_url?: string | null;
    },
  ) {
    return prisma.generation_sessions.update({
      where: { id },
      data,
    });
  }

  static deleteById(id: string) {
    return prisma.generation_sessions.delete({ where: { id } });
  }
}
