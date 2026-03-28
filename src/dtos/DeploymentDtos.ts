import { z } from "zod";

// Provider enum matching Prisma schema
export const DeploymentProviderEnum = z.enum(["VERCEL", "RENDER", "GITHUB_PAGES"]);
export type DeploymentProvider = z.infer<typeof DeploymentProviderEnum>;

export const DeploymentStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "DEPLOYED", "FAILED", "ROLLED_BACK"]);
export type DeploymentStatus = z.infer<typeof DeploymentStatusEnum>;

export const DeploymentEnvironmentEnum = z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]);
export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentEnum>;

// Schema for starting a new deployment (triggers provider workflow)
export const StartDeploymentSchema = z.object({
  provider: DeploymentProviderEnum,
  environment: DeploymentEnvironmentEnum.default("DEVELOPMENT"),
  generation_session_id: z.string().uuid().nullable().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export type StartDeploymentRequest = z.infer<typeof StartDeploymentSchema>;

// Schema for creating a deployment record (internal/CRUD)
export const CreateDeploymentSchema = z.object({
  environment: DeploymentEnvironmentEnum.default("DEVELOPMENT"),
  status: DeploymentStatusEnum.default("PENDING"),
  provider: DeploymentProviderEnum.nullable().optional(),
  deploy_url: z.string().url().nullable().optional(),
  error_message: z.string().nullable().optional(),
  metadata_json: z.record(z.string(), z.unknown()).nullable().optional(),
  generation_session_id: z.string().uuid().nullable().optional(),
});

export type CreateDeploymentRequest = z.infer<typeof CreateDeploymentSchema>;

// Schema for updating a deployment record
export const UpdateDeploymentSchema = z.object({
  environment: DeploymentEnvironmentEnum.optional(),
  status: DeploymentStatusEnum.optional(),
  provider: DeploymentProviderEnum.nullable().optional(),
  deploy_url: z.string().url().nullable().optional(),
  error_message: z.string().nullable().optional(),
  metadata_json: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type UpdateDeploymentRequest = z.infer<typeof UpdateDeploymentSchema>;

// Response type for deployment details
export interface DeploymentResponse {
  id: string;
  api_id: string;
  generation_session_id: string | null;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  provider: DeploymentProvider | null;
  deploy_url: string | null;
  error_message: string | null;
  metadata_json: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}
