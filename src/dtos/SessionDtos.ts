import { z } from "zod";

export const RunGenerationSchema = z.object({
  provider: z.string().min(1, "Provider is required").default("openai"),
  model: z.string().min(1, "Model is required").default("gpt-4o"),
});

export type RunGenerationRequest = z.infer<typeof RunGenerationSchema>;

export const SessionFilterSchema = z.object({
  status: z
    .enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"])
    .optional(),
});

export type SessionFilter = z.infer<typeof SessionFilterSchema>;
