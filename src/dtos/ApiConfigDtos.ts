import { z } from "zod";

export const CreateApiConfigSchema = z.object({
  key: z.string().min(1, "Key is required").max(200),
  value: z.string().min(1, "Value is required"),
  is_secret: z.boolean().default(false),
});

export type CreateApiConfigRequest = z.infer<typeof CreateApiConfigSchema>;

export const UpdateApiConfigSchema = z.object({
  key: z.string().min(1).max(200).optional(),
  value: z.string().min(1).optional(),
  is_secret: z.boolean().optional(),
});

export type UpdateApiConfigRequest = z.infer<typeof UpdateApiConfigSchema>;
