import { z } from "zod";

export const CreateDeploymentSchema = z.object({
  environment: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]).default("DEVELOPMENT"),
  status: z.enum(["PENDING", "IN_PROGRESS", "DEPLOYED", "FAILED", "ROLLED_BACK"]).default("PENDING"),
  provider: z.string().max(200).nullable().optional(),
  metadata_json: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreateDeploymentRequest = z.infer<typeof CreateDeploymentSchema>;

export const UpdateDeploymentSchema = z.object({
  environment: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DEPLOYED", "FAILED", "ROLLED_BACK"]).optional(),
  provider: z.string().max(200).nullable().optional(),
  metadata_json: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type UpdateDeploymentRequest = z.infer<typeof UpdateDeploymentSchema>;
