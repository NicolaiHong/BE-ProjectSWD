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
    cssStrategy: z.enum(["tailwind", "css-modules", "styled-components"]).default("tailwind"),
  })
  .transform((data) => ({
    ...data,
    model: data.model?.trim() || DEFAULT_MODELS[data.provider] || "gpt-4o",
  }));

export type RunGenerationRequest = z.output<typeof RunGenerationSchema>;

export const SessionFilterSchema = z.object({
  status: z
    .enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"])
    .optional(),
});

export type SessionFilter = z.infer<typeof SessionFilterSchema>;
