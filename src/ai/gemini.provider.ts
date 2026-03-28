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
      console.error(
        "[GeminiProvider] Full API response:",
        JSON.stringify(data, null, 2).substring(0, 1000),
      );
      throw new Error("No content in Gemini response");
    }

    // Declare jsonContent in outer scope so it's available for error logging
    let jsonContent = "";
    let parsed: any;

    try {
      // Step 1: Start with raw trimmed content
      jsonContent = content.trim();
      const rawPreview = jsonContent.substring(0, 200);

      // Step 2: Strip markdown code fences if present (```json ... ``` or ``` ... ```)
      // Use a greedy match for the content inside fences
      const codeFenceMatch = jsonContent.match(
        /^[\s\S]*?```(?:json)?\s*\n?([\s\S]*?)\n?```[\s\S]*$/,
      );
      if (codeFenceMatch) {
        jsonContent = codeFenceMatch[1].trim();
      } else {
        // Also try inline code fence pattern
        const inlineMatch = jsonContent.match(/```(?:json)?\s*([\s\S]+?)```/);
        if (inlineMatch) {
          jsonContent = inlineMatch[1].trim();
        }
      }

      // Step 3: Extract JSON object boundaries (handle extra text before/after)
      const jsonStart = jsonContent.indexOf("{");
      const jsonEnd = jsonContent.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
      } else if (jsonStart === -1 && jsonEnd === -1) {
        // No JSON object found at all
        throw new Error(
          `No JSON object found in response. Raw preview: ${rawPreview}`,
        );
      } else if (jsonStart === -1) {
        // Missing opening brace but has closing - likely truncated at start
        throw new Error(
          `JSON appears truncated (missing opening brace). Raw preview: ${rawPreview}`,
        );
      } else {
        // Has opening but no closing - truncated response
        throw new Error(
          `JSON appears truncated (missing closing brace). finishReason: ${finishReason}`,
        );
      }

      // Step 4: Remove control characters (keep valid whitespace)
      jsonContent = jsonContent.replace(
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
        "",
      );

      // Step 5: First parse attempt
      try {
        parsed = JSON.parse(jsonContent);
      } catch (firstError: any) {
        console.warn(
          "[GeminiProvider] First parse attempt failed:",
          firstError.message,
        );
        console.warn("[GeminiProvider] Attempting JSON repair...");

        // Repair attempt: escape unescaped newlines/tabs within string values
        let repaired = jsonContent;
        repaired = repaired.replace(
          /"([^"\\]*(\\.[^"\\]*)*)"/g,
          (match: string) => {
            return match
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")
              .replace(/\t/g, "\\t");
          },
        );

        parsed = JSON.parse(repaired);
        console.log("[GeminiProvider] JSON repair successful");
      }
    } catch (parseError: any) {
      // Comprehensive error logging
      console.error(
        "[GeminiProvider] ========== JSON PARSE FAILURE ==========",
      );
      console.error("[GeminiProvider] Parse error:", parseError.message);
      console.error("[GeminiProvider] finishReason:", finishReason);
      console.error("[GeminiProvider] Raw content length:", content.length);
      console.error(
        "[GeminiProvider] Raw content preview (first 500 chars):",
        content.substring(0, 500),
      );
      console.error(
        "[GeminiProvider] Raw content end (last 200 chars):",
        content.substring(Math.max(0, content.length - 200)),
      );

      // Show what we tried to parse (if jsonContent was populated)
      if (jsonContent && jsonContent !== content.trim()) {
        console.error(
          "[GeminiProvider] Extracted JSON preview (first 500 chars):",
          jsonContent.substring(0, 500),
        );
        console.error(
          "[GeminiProvider] Extracted JSON length:",
          jsonContent.length,
        );
      }

      // Show context around parse error position if available
      const posMatch = parseError.message.match(/position (\d+)/i);
      if (posMatch && jsonContent) {
        const pos = parseInt(posMatch[1], 10);
        const start = Math.max(0, pos - 50);
        const end = Math.min(jsonContent.length, pos + 50);
        console.error(
          `[GeminiProvider] Content around error position ${pos}:`,
          jsonContent.substring(start, end),
        );
        console.error(
          `[GeminiProvider] Character at position: '${jsonContent[pos]}' (code: ${jsonContent.charCodeAt(pos)})`,
        );
      }
      console.error(
        "[GeminiProvider] ========================================",
      );

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
