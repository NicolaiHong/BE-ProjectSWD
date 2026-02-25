import { z } from "zod";

export const CreateUiSchemaSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  schema_json: z.record(z.string(), z.unknown()).or(z.array(z.unknown())),
});

export type CreateUiSchemaRequest = z.infer<typeof CreateUiSchemaSchema>;

export const UpdateUiSchemaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  schema_json: z.record(z.string(), z.unknown()).or(z.array(z.unknown())).optional(),
});

export type UpdateUiSchemaRequest = z.infer<typeof UpdateUiSchemaSchema>;
