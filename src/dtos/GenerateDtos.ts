import { z } from "zod";

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  apiId: z.string().uuid().optional(),
  provider: z.enum(["openai", "gemini"]).default("openai"),
  model: z.string().min(1).default("gpt-4o"),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
