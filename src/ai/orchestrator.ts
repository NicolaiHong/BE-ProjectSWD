import { config } from "../config/constants";
import { OpenAIProvider } from "./openai.provider";
import { GeminiProvider } from "./gemini.provider";
import { GroqProvider } from "./groq.provider";
import { FileApplier } from "./fileApplier";
import type { IAIProvider, AIResponse, AIFileChange } from "./provider";
import type {
  RunGenerationRequest,
  RunApiGenerationRequest,
} from "../dtos/SessionDtos";
import path from "path";
import { execSync } from "child_process";
import fs from "fs";
import yaml from "js-yaml";
import { ApiRepository } from "../repositories/api.repository";

function getProvider(providerName: string): IAIProvider {
  switch (providerName.toLowerCase()) {
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

export interface OrchestrationResult {
  summary_md: string;
  commit_sha?: string;
  pr_url?: string;
  changes: AIFileChange[];
}

export class Orchestrator {
  static async run(
    sessionId: string,
    project: any,
    docs: any[],
    data: RunGenerationRequest,
  ): Promise<OrchestrationResult> {
    console.log(`[Orchestrator] Starting generation for session ${sessionId}`);

    const targetApi = data.api_id
      ? await ApiRepository.findById(data.api_id)
      : null;
    if (data.api_id && !targetApi) {
      throw new Error(`API ${data.api_id} not found for scoped generation`);
    }
    const apiForScope =
      targetApi &&
      project?.id &&
      targetApi.project_id &&
      targetApi.project_id !== project.id
        ? null
        : targetApi;
    if (targetApi && !apiForScope) {
      console.warn(
        `[Orchestrator] API ${targetApi.id} does not belong to project ${project?.id}; skipping scope filter`,
      );
    }

    const scopedDocs =
      data.api_id && apiForScope
        ? this.scopeDocsToApi(
            docs,
            data.api_id,
            apiForScope?.name,
            apiForScope?.base_url,
          )
        : docs;

    const prompt = this.buildPrompt(
      project,
      scopedDocs,
      data,
      apiForScope ?? undefined,
    );

    const provider = getProvider(data.provider);
    console.log(
      `[Orchestrator] Using provider: ${provider.name}, model: ${data.model}`,
    );
    const aiResponse = await provider.generateCode(prompt, data.model);
    console.log(
      `[Orchestrator] AI returned ${aiResponse.changes.length} changes, ${aiResponse.commands.length} commands`,
    );

    const isPreview = data.mode === "PREVIEW";
    const workspaceDir = path.join(
      config.workspaceRoot,
      project.name.replace(/[^a-zA-Z0-9_-]/g, "_"),
    );
    if (!isPreview) {
      await FileApplier.apply(workspaceDir, aiResponse.changes);
      console.log(`[Orchestrator] File changes applied to ${workspaceDir}`);
    } else {
      console.log(
        `[Orchestrator] Preview mode detected — skipping file apply & git`,
      );
    }

    let commitSha: string | undefined;
    let prUrl: string | undefined;

    if (
      !isPreview &&
      project.repo_url &&
      fs.existsSync(path.join(workspaceDir, ".git"))
    ) {
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
      changes: aiResponse.changes,
    };
  }

  /**
   * API-centric generation: works with or without a project.
   * When no project is linked, workspace is derived from API name.
   */
  static async runForApi(
    sessionId: string,
    project: any | null,
    api: any,
    docs: any[],
    data: RunApiGenerationRequest,
  ): Promise<OrchestrationResult> {
    console.log(
      `[Orchestrator] Starting API-scoped generation for session ${sessionId}, API ${api.name}`,
    );

    // Scope docs to API
    const scopedDocs = this.scopeDocsToApi(
      docs,
      api.id,
      api.name,
      api.base_url,
    );

    // Build prompt - use API info when no project
    const projectContext = project ?? {
      name: api.name,
      description: api.description,
    };
    const prompt = this.buildPrompt(
      projectContext,
      scopedDocs,
      { ...data, api_id: api.id },
      api,
    );

    const provider = getProvider(data.provider);
    console.log(
      `[Orchestrator] Using provider: ${provider.name}, model: ${data.model}`,
    );
    const aiResponse = await provider.generateCode(prompt, data.model);
    console.log(
      `[Orchestrator] AI returned ${aiResponse.changes.length} changes, ${aiResponse.commands.length} commands`,
    );

    const isPreview = data.mode === "PREVIEW";

    // Workspace: use project name if available, otherwise API name
    const workspaceName = project?.name ?? api.name;
    const workspaceDir = path.join(
      config.workspaceRoot,
      workspaceName.replace(/[^a-zA-Z0-9_-]/g, "_"),
    );

    if (!isPreview) {
      await FileApplier.apply(workspaceDir, aiResponse.changes);
      console.log(`[Orchestrator] File changes applied to ${workspaceDir}`);
    } else {
      console.log(
        `[Orchestrator] Preview mode detected — skipping file apply & git`,
      );
    }

    // Git operations only if we have a project with repo_url
    let commitSha: string | undefined;
    if (
      !isPreview &&
      project?.repo_url &&
      fs.existsSync(path.join(workspaceDir, ".git"))
    ) {
      try {
        commitSha = this.gitCommit(workspaceDir, sessionId);
        console.log(`[Orchestrator] Git commit: ${commitSha}`);
      } catch (err: any) {
        console.warn(`[Orchestrator] Git operations failed: ${err.message}`);
      }
    }

    return {
      summary_md: aiResponse.summary_md,
      commit_sha: commitSha,
      changes: aiResponse.changes,
    };
  }

  private static scopeDocsToApi(
    docs: any[],
    apiId: string,
    apiName?: string,
    apiBaseUrl?: string | null,
  ): any[] {
    return docs.map((doc) => {
      if (doc.type !== "OPENAPI") return doc;
      const { content, filtered, keptPaths, totalPaths } = this.filterOpenApi(
        doc.content,
        apiId,
        apiName,
        apiBaseUrl || undefined,
      );
      if (filtered) {
        console.log(
          `[Orchestrator] Filtered OpenAPI for API ${apiId} (${apiName ?? "unknown"}): kept ${keptPaths}/${totalPaths} paths`,
        );
      } else {
        console.log(
          `[Orchestrator] OpenAPI filter skipped (no matches) for API ${apiId} (${apiName ?? "unknown"})`,
        );
      }
      return { ...doc, content };
    });
  }

  private static parseOpenApi(content: string): any | null {
    try {
      return JSON.parse(content);
    } catch {}
    try {
      return yaml.load(content) as any;
    } catch {
      return null;
    }
  }

  private static filterOpenApi(
    content: string,
    apiId?: string,
    apiName?: string,
    apiBaseUrl?: string,
  ): {
    content: string;
    filtered: boolean;
    keptPaths: number;
    totalPaths: number;
  } {
    const spec = this.parseOpenApi(content);
    if (!spec || typeof spec !== "object" || !spec.paths) {
      return { content, filtered: false, keptPaths: 0, totalPaths: 0 };
    }

    const totalPaths = Object.keys(spec.paths || {}).length;
    const apiIdLower = apiId?.toLowerCase();
    const apiNameLower = apiName?.toLowerCase();
    const apiNameSlug = apiNameLower?.replace(/[^a-z0-9]+/g, "-");

    const httpMethods = new Set([
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "options",
      "head",
      "trace",
    ]);

    const filteredPaths: Record<string, any> = {};
    for (const [pathKey, pathValue] of Object.entries<any>(spec.paths)) {
      if (!pathValue || typeof pathValue !== "object") continue;

      const scopedOps: Record<string, any> = {};
      for (const [method, op] of Object.entries<any>(pathValue)) {
        const methodLower = method.toLowerCase();
        if (!httpMethods.has(methodLower)) continue;
        const opTags: string[] = Array.isArray(op?.tags)
          ? op.tags.map((t: any) => String(t).toLowerCase())
          : [];

        const tagMatch = apiNameLower && opTags.includes(apiNameLower);
        const idMatch =
          apiIdLower &&
          typeof op?.["x-api-id"] === "string" &&
          op["x-api-id"].toLowerCase() === apiIdLower;
        const pathMatch =
          apiNameSlug && pathKey.toLowerCase().includes(apiNameSlug);
        const serverMatch =
          apiBaseUrl &&
          Array.isArray(spec.servers) &&
          spec.servers.some(
            (srv: any) =>
              typeof srv?.url === "string" &&
              srv.url.toLowerCase().includes(apiBaseUrl.toLowerCase()),
          );

        const matched = idMatch || tagMatch || pathMatch || serverMatch;
        if (matched) {
          scopedOps[methodLower] = op;
        }
      }

      if (Object.keys(scopedOps).length > 0) {
        filteredPaths[pathKey] = scopedOps;
      }
    }

    if (Object.keys(filteredPaths).length === 0) {
      return { content, filtered: false, keptPaths: 0, totalPaths };
    }

    spec.paths = filteredPaths;

    // Keep only tags that are still referenced
    if (Array.isArray(spec.tags)) {
      const usedTagNames = new Set<string>();
      for (const pathObj of Object.values<any>(filteredPaths)) {
        for (const op of Object.values<any>(pathObj)) {
          if (Array.isArray(op?.tags)) {
            op.tags.forEach((t: any) =>
              usedTagNames.add(String(t).toLowerCase()),
            );
          }
        }
      }
      spec.tags = spec.tags.filter((t: any) =>
        t?.name ? usedTagNames.has(String(t.name).toLowerCase()) : false,
      );
    }

    if (apiBaseUrl) {
      if (Array.isArray(spec.servers)) {
        const servers = spec.servers.filter(
          (srv: any) =>
            typeof srv?.url === "string" && srv.url.includes(apiBaseUrl),
        );
        spec.servers = servers.length > 0 ? servers : [{ url: apiBaseUrl }];
      } else {
        spec.servers = [{ url: apiBaseUrl }];
      }
    }

    return {
      content: JSON.stringify(spec, null, 2),
      filtered: true,
      keptPaths: Object.keys(filteredPaths).length,
      totalPaths,
    };
  }

  private static buildPrompt(
    project: any,
    docs: any[],
    data: RunGenerationRequest,
    api?: any,
  ): string {
    const docMap = new Map<string, string>();
    for (const doc of docs) {
      docMap.set(doc.type, doc.content);
    }

    const framework = data.framework || "react";
    const cssStrategy = data.cssStrategy || "tailwind";
    const isPreview = data.mode === "PREVIEW";

    const apiScope = api
      ? `- **Selected API**: ${api.name} (${api.id})${api.base_url ? ` — base URL: ${api.base_url}` : ""}`
      : "- **Selected API**: All APIs in OpenAPI (no filtering applied)";

    const sections = [
      `# Frontend Code Generation Request`,
      ``,
      `## Project Context`,
      `- **Project Name**: ${project.name}`,
      project.description ? `- **Description**: ${project.description}` : "",
      `- **Target Framework**: ${framework}`,
      `- **CSS Strategy**: ${cssStrategy}`,
      apiScope,
      data.api_id
        ? `- **Scope Note**: OpenAPI spec has been filtered to the selected API to reduce noise.`
        : "",
      `- **Generation Mode**: ${data.mode}`,
      ``,
      `---`,
      ``,
      `## 1. OpenAPI Specification`,
      `Use this to generate the **API service layer** (\`services/\` folder). If the spec was filtered, only the selected API paths are present:`,
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
      isPreview
        ? `## 5. Preview Output Requirements (Mode: PREVIEW)`
        : `## 5. Output Requirements`,
      isPreview
        ? `- Produce a single self-contained HTML file that previews the primary user flows; inline CSS/JS (Tailwind CDN ok).`
        : `- Generate full source files as described below.`,
      isPreview
        ? `- Keep it lightweight (<= 400 lines). Focus on happy-path flows and key UI states.`
        : `- Ensure full routing, services, and components are present.`,
      isPreview
        ? `- In the JSON response, return exactly one change: { "path": "preview.html", "action": "create", "content": "<!doctype html>..." }`
        : `- Use multiple files under src/ and root configs as needed.`,
      isPreview
        ? `- Set "commands" to an empty array [].`
        : `- Include npm/yarn commands under "commands" if needed.`,
      isPreview
        ? `- Put a short summary in "summary_md" followed by the same HTML inside a \`\`\`html code block for easy rendering.`
        : ``,
      ``,
      `---`,
      ``,
      `## Mandatory Output Checklist`,
      isPreview
        ? `Your generated output MUST include:`
        : `Your generated code MUST include:`,
      isPreview
        ? `1. ✅ One file: \`preview.html\` (self-contained, inline styles/scripts, no external assets beyond CDN).`
        : `1. ✅ \`package.json\` with all dependencies (react, react-dom, react-router-dom, axios, zod, react-hook-form, ${cssStrategy === "tailwind" ? "tailwindcss, postcss, autoprefixer" : cssStrategy === "styled-components" ? "styled-components, @types/styled-components" : ""})`,
      isPreview ? `` : `2. ✅ \`tsconfig.json\` with strict mode`,
      isPreview ? `` : `3. ✅ \`vite.config.ts\` with React plugin`,
      isPreview && cssStrategy === "tailwind"
        ? `- If you rely on Tailwind, use CDN version; do NOT emit config files.`
        : cssStrategy === "tailwind"
          ? `4. ✅ \`tailwind.config.js\` and \`postcss.config.js\``
          : "",
      isPreview ? `` : `5. ✅ \`index.html\` (Vite entry)`,
      isPreview ? `` : `6. ✅ \`src/main.tsx\` (app entry point)`,
      isPreview ? `` : `7. ✅ \`src/App.tsx\` (router setup with all routes)`,
      isPreview ? `` : `8. ✅ \`src/services/api.ts\` (base Axios instance)`,
      isPreview ? `` : `9. ✅ At least one service file per API resource`,
      isPreview ? `` : `10. ✅ TypeScript interfaces for all entities`,
      isPreview ? `` : `11. ✅ Page components for all actions/use-cases`,
      isPreview ? `` : `12. ✅ Reusable UI components based on design system`,
      ``,
      `Respond with the strict JSON format as specified in your system instructions.`,
      ``,
      // Custom prompt from user (if provided)
      (data as any).customPrompt ? `## Additional User Instructions` : "",
      (data as any).customPrompt
        ? `The user has provided the following additional requirements. Please incorporate them into your generated code:`
        : "",
      (data as any).customPrompt
        ? `\`\`\`\n${(data as any).customPrompt}\n\`\`\``
        : "",
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
