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

  async generateCode(
    prompt: string,
    model: string,
    systemPrompt?: string,
  ): Promise<AIResponse> {
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
          parts: [{ text: systemPrompt || SYSTEM_PROMPT }],
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
          responseSchema: {
            type: "object",
            properties: {
              summary_md: {
                type: "string",
                description: "Brief markdown summary of the changes",
              },
              changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string", description: "File path" },
                    action: {
                      type: "string",
                      enum: ["create", "update", "delete"],
                    },
                    content: {
                      type: "string",
                      description: "File content (empty for delete)",
                    },
                  },
                  required: ["path", "action", "content"],
                },
              },
              commands: {
                type: "array",
                items: { type: "string" },
                description: "Shell commands to run (usually empty)",
              },
            },
            required: ["summary_md", "changes", "commands"],
          },
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

    // Check finish reason for truncation
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== "STOP") {
      console.warn(
        `[GeminiProvider] Response may be incomplete. finishReason: ${finishReason}`,
      );
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("[GeminiProvider] Full API response:", JSON.stringify(data, null, 2).substring(0, 1000));
      throw new Error("No content in Gemini response");
    }

    let parsed: any;
    try {
      // Try to extract JSON from the content
      let jsonContent = content.trim();

      // Remove markdown code blocks if present (```json ... ```)
      const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1].trim();
      }

      // Try to find JSON object boundaries if content has extra text
      const jsonStart = jsonContent.indexOf("{");
      const jsonEnd = jsonContent.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
      } else if (jsonStart === -1 && jsonContent.startsWith('"')) {
        // Response might be missing opening brace - try to fix
        jsonContent = "{" + jsonContent;
        const newEnd = jsonContent.lastIndexOf("}");
        if (newEnd === -1) {
          // Also missing closing brace - try to complete the JSON
          // This is a best-effort fix for truncated responses
          jsonContent = jsonContent + '"}]}';
        }
      }

      // Remove any control characters that might break JSON parsing
      // Keep valid whitespace: space, tab, newline, carriage return
      jsonContent = jsonContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

      // First attempt: direct parse
      try {
        parsed = JSON.parse(jsonContent);
      } catch (firstError) {
        console.warn("[GeminiProvider] First parse attempt failed, trying repair...");

        // Repair attempt: fix common issues
        // 1. Escape unescaped newlines inside strings (not between fields)
        // This is tricky - we'll try a simpler approach: re-encode with proper escaping

        // Try to manually fix the JSON by finding and fixing string values
        // Replace actual newlines with escaped newlines (but not between key-value pairs)
        let repaired = jsonContent;

        // Find all string values and escape newlines within them
        // This regex finds strings and replaces unescaped newlines
        repaired = repaired.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
          // Within matched string, escape any actual newlines
          return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
        });

        parsed = JSON.parse(repaired);
        console.log("[GeminiProvider] JSON repair successful");
      }
    } catch (parseError: any) {
      // Log the full content for debugging
      console.error("[GeminiProvider] Failed to parse JSON response:");
      console.error("[GeminiProvider] Parse error:", parseError.message);
      console.error("[GeminiProvider] Content length:", content.length);
      console.error("[GeminiProvider] finishReason:", finishReason);
      console.error(
        "[GeminiProvider] Content preview:",
        content.substring(0, 500),
      );
      console.error(
        "[GeminiProvider] Content end:",
        content.substring(Math.max(0, content.length - 200)),
      );

      // Try to find the position of the error
      const posMatch = parseError.message.match(/position (\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        console.error(
          "[GeminiProvider] Content around error position:",
          jsonContent.substring(Math.max(0, pos - 50), pos + 50),
        );
      }

      throw new Error(
        `Gemini response is not valid JSON (finishReason: ${finishReason}): ${parseError.message}`,
      );
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
