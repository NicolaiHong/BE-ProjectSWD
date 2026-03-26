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
  readonly name: string;
  generateCode(
    prompt: string,
    model: string,
    systemPrompt?: string,
  ): Promise<AIResponse>;
}
