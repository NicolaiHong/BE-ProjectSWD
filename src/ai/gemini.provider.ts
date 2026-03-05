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

export class GeminiProvider implements IAIProvider {
  readonly name = "gemini";

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.geminiApiKey;
  }

  private resolveModelId(model: string): string {
    return model.replace(/^models\//, "");
  }

  private getMaxOutputTokens(model: string): number {
    // Gemini 2.0 Flash / Flash-Lite 
    if (model.startsWith("gemini-2.0")) return 8192;
    // Gemini 2.5 Flash / Pro / Flash-Lite 
    if (model.startsWith("gemini-2.5")) return 65536;
    return 8192;
  }

  async generateCode(prompt: string, model: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const modelId = this.resolveModelId(model);
    const maxTokens = this.getMaxOutputTokens(modelId);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini API error ${response.status}: ${errorBody.substring(0, 500)}`,
      );
    }

    const data = (await response.json()) as any;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini response");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Gemini response is not valid JSON: ${content.substring(0, 200)}`);
    }

    const validated = AIResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `Gemini response does not match expected schema: ${validated.error.message}`,
      );
    }

    return validated.data;
  }
}
