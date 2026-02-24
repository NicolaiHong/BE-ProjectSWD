import { config } from "../config/constants";
import { OpenAIProvider } from "./openai.provider";
import { FileApplier } from "./fileApplier";
import type { IAIProvider, AIResponse } from "./provider";
import type { RunGenerationRequest } from "../dtos/SessionDtos";
import path from "path";
import { execSync } from "child_process";
import fs from "fs";

/**
 * Registry of available AI providers.
 * Add new providers here as they are implemented.
 */
function getProvider(providerName: string): IAIProvider {
  switch (providerName.toLowerCase()) {
    case "openai":
      return new OpenAIProvider();
    // TODO: Add more providers (gemini, perplexity, etc.)
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

export interface OrchestrationResult {
  summary_md: string;
  commit_sha?: string;
  pr_url?: string;
}

export class Orchestrator {
  /**
   * Run the full generation pipeline:
   * 1. Build prompt from 4 docs + action spec
   * 2. Call AI provider
   * 3. Apply file changes safely
   * 4. Git commit if repo_url configured
   */
  static async run(
    sessionId: string,
    project: any,
    docs: any[],
    data: RunGenerationRequest,
  ): Promise<OrchestrationResult> {
    console.log(`[Orchestrator] Starting generation for session ${sessionId}`);

    // 1. Build prompt
    const prompt = this.buildPrompt(project, docs);

    // 2. Call AI provider
    const provider = getProvider(data.provider);
    console.log(`[Orchestrator] Using provider: ${provider.name}, model: ${data.model}`);
    const aiResponse = await provider.generateCode(prompt, data.model);
    console.log(
      `[Orchestrator] AI returned ${aiResponse.changes.length} changes, ${aiResponse.commands.length} commands`,
    );

    // 3. Apply file changes
    const workspaceDir = path.join(config.workspaceRoot, project.name.replace(/[^a-zA-Z0-9_-]/g, "_"));
    await FileApplier.apply(workspaceDir, aiResponse.changes);
    console.log(`[Orchestrator] File changes applied to ${workspaceDir}`);

    // 4. Git commit if repo_url is configured
    let commitSha: string | undefined;
    let prUrl: string | undefined;

    if (project.repo_url && fs.existsSync(path.join(workspaceDir, ".git"))) {
      try {
        commitSha = this.gitCommit(workspaceDir, sessionId);
        console.log(`[Orchestrator] Git commit: ${commitSha}`);

        // TODO: Implement PR creation via GitHub API when needed
        // For now, store null for pr_url. When implementing:
        // prUrl = await this.createPullRequest(project, commitSha, aiResponse.summary_md);
        prUrl = undefined;
      } catch (err: any) {
        console.warn(`[Orchestrator] Git operations failed: ${err.message}`);
      }
    }

    return {
      summary_md: aiResponse.summary_md,
      commit_sha: commitSha,
      pr_url: prUrl,
    };
  }

  /**
   * Build a comprehensive prompt from the 4 document types and project context.
   */
  private static buildPrompt(project: any, docs: any[]): string {
    const docMap = new Map<string, string>();
    for (const doc of docs) {
      docMap.set(doc.type, doc.content);
    }

    const sections = [
      `# Project: ${project.name}`,
      project.description ? `## Description\n${project.description}` : "",
      "",
      "## OpenAPI Specification",
      "```json",
      docMap.get("OPENAPI") || "N/A",
      "```",
      "",
      "## Entity Schema",
      "```json",
      docMap.get("ENTITY_SCHEMA") || "N/A",
      "```",
      "",
      "## Action Specification",
      "```",
      docMap.get("ACTION_SPEC") || "N/A",
      "```",
      "",
      "## Design System",
      "```json",
      docMap.get("DESIGN_SYSTEM") || "N/A",
      "```",
      "",
      "## Instructions",
      "Based on the above specifications:",
      "1. Generate all necessary code files to implement the described API and UI components",
      "2. Follow the OpenAPI spec for endpoint definitions",
      "3. Use the Entity Schema for data models",
      "4. Follow the Action Spec for business logic",
      "5. Apply the Design System for any frontend components",
      "6. Ensure type safety and proper error handling",
      "",
      "Respond with the strict JSON format as specified in system prompt.",
    ];

    return sections.filter(Boolean).join("\n");
  }

  /**
   * Create a git commit with all changes in the workspace.
   */
  private static gitCommit(workspaceDir: string, sessionId: string): string {
    const opts = { cwd: workspaceDir, encoding: "utf-8" as const };
    execSync("git add -A", opts);
    execSync(
      `git commit -m "AI generation session ${sessionId}" --allow-empty`,
      opts,
    );
    const sha = execSync("git rev-parse HEAD", opts).trim();
    return sha;
  }
}
