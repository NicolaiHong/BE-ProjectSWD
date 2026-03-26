import { config } from "../config/constants";
import { OpenAIProvider } from "../ai/openai.provider";
import { GeminiProvider } from "../ai/gemini.provider";
import type { IAIProvider } from "../ai/provider";
import { GeneratedCodeRepository } from "../repositories/generatedCode.repository";
import { ApiRepository } from "../repositories/api.repository";
import { SYSTEM_PROMPT } from "../ai/systemPrompt";
import { PREVIEW_SYSTEM_PROMPT, buildPreviewPrompt } from "../ai/previewPrompt";
import { ApiParser } from "../ai/apiParser";

function getProvider(providerName: string): IAIProvider {
  switch (providerName.toLowerCase()) {
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

export interface GenerateResult {
  success: boolean;
  changes: { fileName: string; codeContent: string }[];
  summary: string;
}

export class GenerateService {
  /**
   * Simple generate endpoint for VS Code Extension.
   * Takes a prompt, calls LLM, maps output to {fileName, codeContent}[].
   * If apiId is provided, saves generated code records into DB.
   */
  static async generate(
    prompt: string,
    providerName: string = "openai",
    model: string = "gpt-4o",
    apiId?: string,
  ): Promise<GenerateResult> {
    const provider = getProvider(providerName);
    console.log(
      `[GenerateService] Calling ${provider.name} with model ${model}`,
    );

    const aiResponse = await provider.generateCode(prompt, model);

    // Map AIResponse.changes -> {fileName, codeContent}[]
    const changes = aiResponse.changes.map((change) => ({
      fileName: change.path,
      codeContent: change.content,
    }));

    // If apiId provided, verify it exists and save generated codes
    if (apiId) {
      const api = await ApiRepository.findById(apiId);
      if (api) {
        await GeneratedCodeRepository.bulkCreate(
          apiId,
          changes.map((c) => ({
            file_path: c.fileName,
            content: c.codeContent,
            language:
              c.fileName.endsWith(".tsx") || c.fileName.endsWith(".ts")
                ? "typescript"
                : undefined,
          })),
        );
        console.log(
          `[GenerateService] Saved ${changes.length} generated codes for API ${apiId}`,
        );
      }
    }

    return {
      success: true,
      changes,
      summary: aiResponse.summary_md,
    };
  }

  /**
   * Preview generation with simplified input flow.
   * Only requires API spec, actions and design are optional text prompts.
   */
  static async generatePreview(
    apiSpec: string,
    providerName: string = "openai",
    model: string = "gpt-4o",
    actionsPrompt?: string,
    designPrompt?: string,
    customPrompt?: string,
  ): Promise<GenerateResult> {
    const provider = getProvider(providerName);
    console.log(
      `[GenerateService] Preview generation with ${provider.name}, model ${model}`,
    );

    // Parse API spec to extract entities and available actions
    const parsedApi = ApiParser.parse(apiSpec);
    console.log(
      `[GenerateService] Parsed API: ${parsedApi.entities.length} entities, ${parsedApi.availableActions.length} actions`,
    );

    // Build actions context from parsed API if no prompt provided
    const actionsContext =
      actionsPrompt ||
      `Available actions based on API: ${parsedApi.availableActions.join(", ")}`;

    // Build the preview prompt
    const userPrompt = buildPreviewPrompt({
      apiSpec,
      actionsPrompt: actionsContext,
      designPrompt,
      customPrompt,
    });

    // Call AI with preview system prompt
    const aiResponse = await provider.generateCode(
      userPrompt,
      model,
      PREVIEW_SYSTEM_PROMPT,
    );

    // Map response to result format
    const changes = aiResponse.changes.map((change) => ({
      fileName: change.path,
      codeContent: change.content,
    }));

    return {
      success: true,
      changes,
      summary: aiResponse.summary_md,
    };
  }
}
