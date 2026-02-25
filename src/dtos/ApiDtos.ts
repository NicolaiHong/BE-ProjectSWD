import { z } from "zod";

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

export const CreateApiSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  base_url: z.string().url().nullable().optional(),
  version: z.string().max(50).nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DEPRECATED"]).optional(),
});

export type CreateApiRequest = z.infer<typeof CreateApiSchema>;

export const UpdateApiSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  base_url: z.string().url().nullable().optional(),
  version: z.string().max(50).nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DEPRECATED"]).optional(),
});

export type UpdateApiRequest = z.infer<typeof UpdateApiSchema>;
