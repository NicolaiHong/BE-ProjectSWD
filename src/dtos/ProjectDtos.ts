import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  repo_url: z.string().url().nullable().optional(),
  default_branch: z.string().max(100).nullable().optional(),
  vercel_project_id: z.string().max(200).nullable().optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  repo_url: z.string().url().nullable().optional(),
  default_branch: z.string().max(100).nullable().optional(),
  vercel_project_id: z.string().max(200).nullable().optional(),
});

export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;
