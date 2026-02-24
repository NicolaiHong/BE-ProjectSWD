import { z } from "zod";

export const DocumentTypeEnum = z.enum([
  "OPENAPI",
  "ENTITY_SCHEMA",
  "ACTION_SPEC",
  "DESIGN_SYSTEM",
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const UpsertDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required").max(255),
  content: z.string().min(1, "Content is required"),
  content_type: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .default("application/json"),
});

export type UpsertDocumentRequest = z.infer<typeof UpsertDocumentSchema>;
