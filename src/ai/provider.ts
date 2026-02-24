/**
 * AI Provider abstraction – allows swapping between OpenAI, Gemini, etc.
 */

export interface AIFileChange {
  path: string;
  action: "create" | "update" | "delete";
  content: string;
}

export interface AIResponse {
  summary_md: string;
  changes: AIFileChange[];
  commands: string[];
}

export interface IAIProvider {
  /** Human-readable name: "openai", "gemini", etc. */
  readonly name: string;

  /**
   * Generate code changes from the given prompt.
   * Must return strict JSON matching AIResponse.
   */
  generateCode(prompt: string, model: string): Promise<AIResponse>;
}
