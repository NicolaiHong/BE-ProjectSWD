import { z } from "zod";

export const RunGenerationSchema = z.object({
  provider: z.enum(["openai", "gemini"]).default("openai"),
  model: z.string().min(1, "Model is required").default("gpt-4o"),
  framework: z.enum(["react", "vue", "angular"]).default("react"),
  cssStrategy: z.enum(["tailwind", "css-modules", "styled-components"]).default("tailwind"),
});

export type RunGenerationRequest = z.infer<typeof RunGenerationSchema>;

export const SessionFilterSchema = z.object({
  status: z
    .enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"])
    .optional(),
});

export type SessionFilter = z.infer<typeof SessionFilterSchema>;
