import { z } from "zod";

export const CreateGeneratedCodeSchema = z.object({
  file_path: z.string().min(1, "File path is required"),
  content: z.string().min(1, "Content is required"),
  language: z.string().max(50).nullable().optional(),
  generation_session_id: z.string().uuid().nullable().optional(),
});

export type CreateGeneratedCodeRequest = z.infer<typeof CreateGeneratedCodeSchema>;
