import { z } from "zod";
import { config } from "../config/constants";
import type { IAIProvider, AIResponse } from "./provider";
import { SYSTEM_PROMPT } from "./systemPrompt";

const AIResponseSchema = z.object({
  summary_md: z.string(),
  changes: z.array(
    z.object({
      path: z.string(),
      action: z.enum(["create", "update", "delete"]),
      content: z.string().default(""),
    }),
  ),
  commands: z.array(z.string()).default([]),
});

export class OpenAIProvider implements IAIProvider {
  readonly name = "openai";

  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || config.openaiBaseUrl;
    this.apiKey = apiKey || config.openaiApiKey;
  }

  async generateCode(
    prompt: string,
    model: string,
    systemPrompt?: string,
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const url = `${this.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt || SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 16000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI API error ${response.status}: ${errorBody.substring(0, 500)}`,
      );
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(
        `AI response is not valid JSON: ${content.substring(0, 200)}`,
      );
    }

    const validated = AIResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `AI response does not match expected schema: ${validated.error.message}`,
      );
    }

    return validated.data;
  }
}
