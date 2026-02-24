import { z } from "zod";
import { config } from "../config/constants";
import type { IAIProvider, AIResponse } from "./provider";

/**
 * Zod schema to validate the strict JSON returned by the AI model.
 */
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

/**
 * OpenAI-compatible provider.
 * Works with any API that exposes /chat/completions (OpenAI, Azure, local LLMs, etc.).
 */
export class OpenAIProvider implements IAIProvider {
  readonly name = "openai";

  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || config.openaiBaseUrl;
    this.apiKey = apiKey || config.openaiApiKey;
  }

  async generateCode(prompt: string, model: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert code generator. You MUST respond with valid JSON only, no markdown fences, no explanation outside JSON.

The JSON MUST follow this exact structure:
{
  "summary_md": "A markdown summary of what was generated and why",
  "changes": [
    {
      "path": "relative/file/path.ts",
      "action": "create" | "update" | "delete",
      "content": "full file content (empty string for delete)"
    }
  ],
  "commands": ["npm install some-package", "other post-generation commands"]
}

Rules:
- "path" must be a relative file path (no leading /)
- "action" must be one of: create, update, delete
- "content" must be the FULL file content for create/update actions
- "commands" are optional shell commands to run after applying changes
- Do NOT include any text outside the JSON object`;

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
          { role: "system", content: systemPrompt },
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

    // Parse and validate JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`AI response is not valid JSON: ${content.substring(0, 200)}`);
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
