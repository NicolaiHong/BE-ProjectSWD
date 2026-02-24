import { config } from "../config/constants";
import { OpenAIProvider } from "./openai.provider";
import { GeminiProvider } from "./gemini.provider";
import { FileApplier } from "./fileApplier";
import type { IAIProvider, AIResponse } from "./provider";
import type { RunGenerationRequest } from "../dtos/SessionDtos";
import path from "path";
import { execSync } from "child_process";
import fs from "fs";

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

export interface OrchestrationResult {
  summary_md: string;
  commit_sha?: string;
  pr_url?: string;
}

export class Orchestrator {
  static async run(
    sessionId: string,
    project: any,
    docs: any[],
    data: RunGenerationRequest,
  ): Promise<OrchestrationResult> {
    console.log(`[Orchestrator] Starting generation for session ${sessionId}`);

    const prompt = this.buildPrompt(project, docs, data);

    const provider = getProvider(data.provider);
    console.log(`[Orchestrator] Using provider: ${provider.name}, model: ${data.model}`);
    const aiResponse = await provider.generateCode(prompt, data.model);
    console.log(
      `[Orchestrator] AI returned ${aiResponse.changes.length} changes, ${aiResponse.commands.length} commands`,
    );

    const workspaceDir = path.join(config.workspaceRoot, project.name.replace(/[^a-zA-Z0-9_-]/g, "_"));
    await FileApplier.apply(workspaceDir, aiResponse.changes);
    console.log(`[Orchestrator] File changes applied to ${workspaceDir}`);

    let commitSha: string | undefined;
    let prUrl: string | undefined;

    if (project.repo_url && fs.existsSync(path.join(workspaceDir, ".git"))) {
      try {
        commitSha = this.gitCommit(workspaceDir, sessionId);
        console.log(`[Orchestrator] Git commit: ${commitSha}`);

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

  private static buildPrompt(project: any, docs: any[], data: RunGenerationRequest): string {
    const docMap = new Map<string, string>();
    for (const doc of docs) {
      docMap.set(doc.type, doc.content);
    }

    const framework = data.framework || "react";
    const cssStrategy = data.cssStrategy || "tailwind";

    const sections = [
      `# Frontend Code Generation Request`,
      ``,
      `## Project Context`,
      `- **Project Name**: ${project.name}`,
      project.description ? `- **Description**: ${project.description}` : "",
      `- **Target Framework**: ${framework}`,
      `- **CSS Strategy**: ${cssStrategy}`,
      ``,
      `---`,
      ``,
      `## 1. OpenAPI Specification`,
      `Use this to generate the **API service layer** (\`services/\` folder):`,
      `- Create one service file per API resource/tag (e.g., \`services/userService.ts\`, \`services/orderService.ts\`)`,
      `- Generate TypeScript interfaces for all request bodies and response types in \`types/\``,
      `- Use Axios with a base API client that handles auth headers and error intercepting`,
      `- Each service function should be typed: parameters AND return type`,
      ``,
      "```json",
      docMap.get("OPENAPI") || "N/A",
      "```",
      ``,
      `## 2. Entity Schema`,
      `Use this to generate **TypeScript interfaces/types** (\`types/\` folder):`,
      `- One interface per entity`,
      `- Include all relationships (foreign keys → referenced type)`,
      `- Generate form validation schemas using Zod that mirror the entity constraints`,
      `- Use these types consistently across services, components, and pages`,
      ``,
      "```json",
      docMap.get("ENTITY_SCHEMA") || "N/A",
      "```",
      ``,
      `## 3. Action Specification`,
      `Use this to generate **page components and business logic** (\`pages/\` folder):`,
      `- Each action/use-case should map to a page or a distinct UI flow`,
      `- Implement the full user interaction: form → validation → API call → success/error feedback`,
      `- Use React Hook Form for forms with Zod validation`,
      `- Handle loading, error, and empty states for every data-fetching page`,
      ``,
      "```",
      docMap.get("ACTION_SPEC") || "N/A",
      "```",
      ``,
      `## 4. Design System`,
      `Use this to generate **UI components** (\`components/\` folder) and apply styling:`,
      `- Extract colors, fonts, spacing, and border-radius into Tailwind config or CSS variables`,
      `- Build reusable components: Button, Input, Card, Modal, Table, Badge, Alert`,
      `- Ensure consistent styling across all pages using these components`,
      `- Follow the design tokens exactly for brand consistency`,
      ``,
      "```json",
      docMap.get("DESIGN_SYSTEM") || "N/A",
      "```",
      ``,
      `---`,
      ``,
      `## Mandatory Output Checklist`,
      `Your generated code MUST include:`,
      `1. ✅ \`package.json\` with all dependencies (react, react-dom, react-router-dom, axios, zod, react-hook-form, ${cssStrategy === "tailwind" ? "tailwindcss, postcss, autoprefixer" : cssStrategy === "styled-components" ? "styled-components, @types/styled-components" : ""})`,
      `2. ✅ \`tsconfig.json\` with strict mode`,
      `3. ✅ \`vite.config.ts\` with React plugin`,
      cssStrategy === "tailwind" ? `4. ✅ \`tailwind.config.js\` and \`postcss.config.js\`` : "",
      `5. ✅ \`index.html\` (Vite entry)`,
      `6. ✅ \`src/main.tsx\` (app entry point)`,
      `7. ✅ \`src/App.tsx\` (router setup with all routes)`,
      `8. ✅ \`src/services/api.ts\` (base Axios instance)`,
      `9. ✅ At least one service file per API resource`,
      `10. ✅ TypeScript interfaces for all entities`,
      `11. ✅ Page components for all actions/use-cases`,
      `12. ✅ Reusable UI components based on design system`,
      ``,
      `Respond with the strict JSON format as specified in your system instructions.`,
    ];

    return sections.filter(Boolean).join("\n");
  }

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
