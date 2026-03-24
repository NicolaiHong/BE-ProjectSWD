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

export class GroqProvider implements IAIProvider {
  readonly name = "groq";

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.groqApiKey;
  }

  private getMaxTokens(model: string): number {
    // Groq model context/output limits
    if (model.includes("llama-3.3-70b")) return 32768;
    if (model.includes("llama-3.1-70b")) return 32768;
    if (model.includes("llama-3.1-8b")) return 32768;
    if (model.includes("llama3-70b")) return 8192;
    if (model.includes("llama3-8b")) return 8192;
    if (model.includes("mixtral")) return 32768;
    if (model.includes("gemma2")) return 8192;
    if (model.includes("qwen")) return 32768;
    if (model.includes("deepseek")) return 16384;
    return 8192;
  }

  async generateCode(prompt: string, model: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const maxTokens = this.getMaxTokens(model);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Groq API error ${response.status}: ${errorBody.substring(0, 500)}`,
      );
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Groq response");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Groq response is not valid JSON: ${content.substring(0, 200)}`);
    }

    const validated = AIResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `Groq response does not match expected schema: ${validated.error.message}`,
      );
    }

    return validated.data;
  }
}
