import { z } from "zod";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash",
};

export const GenerateRequestSchema = z
  .object({
    prompt: z.string().min(1, "Prompt is required"),
    apiId: z.string().uuid().optional(),
    provider: z.enum(["openai", "gemini"]).default("openai"),
    model: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    model: data.model?.trim() || DEFAULT_MODELS[data.provider] || "gpt-4o",
  }));

export type GenerateRequest = z.output<typeof GenerateRequestSchema>;
