/**
 * Perplexity AI Client
 * Uses Perplexity API for text generation
 */

interface PerplexityResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const apiKey = process.env.PERPLEXITY_API_KEY;
const model = process.env.PERPLEXITY_MODEL || "llama-3.1-8b-instruct";

if (!apiKey)
  throw new Error("PERPLEXITY_API_KEY is required in environment variables");

/**
 * Generate text using Perplexity AI
 * @param promptText - The prompt to send to Perplexity
 * @returns Generated text response
 */
export async function geminiTextForPrompt(promptText: string): Promise<string> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: promptText,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${error}`);
  }

  const data = (await response.json()) as PerplexityResponse;
  const text = data.choices?.[0]?.message?.content ?? "";

  return text.trim();
}
