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

/**
 * Schema for preview generation - simplified input flow
 * Only requires apiSpec, actions and design are optional prompts
 */
export const GeneratePreviewRequestSchema = z
  .object({
    // Required: API specification (OpenAPI YAML/JSON content)
    apiSpec: z.string().min(1, "API specification is required"),
    // Optional: Actions description in natural language
    actionsPrompt: z.string().optional(),
    // Optional: Design description in natural language
    designPrompt: z.string().optional(),
    // Optional: Additional custom prompt
    customPrompt: z.string().optional(),
    // AI provider settings
    provider: z.enum(["openai", "gemini"]).default("openai"),
    model: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    model: data.model?.trim() || DEFAULT_MODELS[data.provider] || "gpt-4o",
    actionsPrompt: data.actionsPrompt?.trim() || undefined,
    designPrompt: data.designPrompt?.trim() || undefined,
    customPrompt: data.customPrompt?.trim() || undefined,
  }));

export type GeneratePreviewRequest = z.output<
  typeof GeneratePreviewRequestSchema
>;
