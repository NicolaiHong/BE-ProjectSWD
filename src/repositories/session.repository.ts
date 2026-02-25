import { prisma } from "../clients/prisma";
import type { gen_status } from "../generated/prisma/enums";

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
    project_id: string;
    provider: string;
    model: string;
    openapi_sha256: string | null;
    entity_schema_sha256: string | null;
    action_spec_sha256: string | null;
    design_system_sha256: string | null;
  }) {
    return prisma.generation_sessions.create({
      data: {
        ...data,
        status: "QUEUED",
      },
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
}
