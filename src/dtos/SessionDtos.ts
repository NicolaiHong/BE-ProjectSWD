import { z } from "zod";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash",
};

export const RunGenerationSchema = z
  .object({
    provider: z.enum(["openai", "gemini"]).default("openai"),
    model: z.string().optional(),
    framework: z.enum(["react", "vue", "angular"]).default("react"),
    cssStrategy: z
      .enum(["tailwind", "css-modules", "styled-components"])
      .default("tailwind"),
    mode: z.enum(["PREVIEW", "FULL_SOURCE"]).default("FULL_SOURCE"),
    api_id: z.string().uuid().optional(),
  })
  .transform((data) => ({
    ...data,
    model: data.model?.trim() || DEFAULT_MODELS[data.provider] || "gpt-4o",
  }));

export type RunGenerationRequest = z.output<typeof RunGenerationSchema>;

// Schema for API-centric generation (api_id comes from URL, not body)
export const RunApiGenerationSchema = z
  .object({
    provider: z.enum(["openai", "gemini"]).default("openai"),
    model: z.string().optional(),
    framework: z.enum(["react", "vue", "angular"]).default("react"),
    cssStrategy: z
      .enum(["tailwind", "css-modules", "styled-components"])
      .default("tailwind"),
    mode: z.enum(["PREVIEW", "FULL_SOURCE"]).default("FULL_SOURCE"),
  })
  .transform((data) => ({
    ...data,
    model: data.model?.trim() || DEFAULT_MODELS[data.provider] || "gpt-4o",
  }));

export type RunApiGenerationRequest = z.output<typeof RunApiGenerationSchema>;

export const SessionFilterSchema = z.object({
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]).optional(),
});

export type SessionFilter = z.infer<typeof SessionFilterSchema>;
