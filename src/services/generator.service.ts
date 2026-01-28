import { GeneratorRepository } from "../repositories/generator.repository";
import { geminiTextForPrompt } from "./gemini.client";
import { FrameworkKey } from "../types/FrameworkKey";
import { FrameworkConfig } from "../interface/FrameworkConfig";

//type FrameworkKey = "react" | "angular" | "vue" | "php" | "nextjs";
const FRAMEWORK_CONFIGS: Record<FrameworkKey, FrameworkConfig> = {
  react: {
    name: "React + TypeScript",
    extension: ".tsx",
    promptHint: `
- React function component with TypeScript
- Use fetch() for API calls
- useState/useEffect for state management
- Keep dependencies minimal (no MUI/Antd unless user specifies)`,
    defaultPath: (pageName) => `src/pages/${pageName}.tsx`,
  },

  angular: {
    name: "Angular + TypeScript",
    extension: ".ts",
    promptHint: `
- Angular standalone component (Angular 17+ style)
- Generate 3 files content in ONE response, clearly separated:
  1. Component TypeScript (.component.ts)
  2. Template HTML (.component.html) 
  3. Component CSS (.component.css)
- Use HttpClient for API calls
- Use signals or RxJS for state`,
    defaultPath: (pageName) => `src/app/${pageName}/${pageName}.component.ts`,
  },

  vue: {
    name: "Vue 3 + TypeScript",
    extension: ".vue",
    promptHint: `
- Vue 3 Single File Component (SFC) with <script setup lang="ts">
- Use Composition API
- Use fetch() or useFetch for API calls
- Keep dependencies minimal`,
    defaultPath: (pageName) => `src/views/${pageName}.vue`,
  },

  php: {
    name: "PHP (Laravel Blade)",
    extension: ".blade.php",
    promptHint: `
- Laravel Blade template
- Include basic CRUD table with pagination
- Use Laravel's @foreach, @if directives
- Assume controller passes $items, $columns variables
- Include basic CSS styling inline or reference Bootstrap`,
    defaultPath: (pageName) => `resources/views/admin/${pageName}.blade.php`,
  },

  nextjs: {
    name: "Next.js 14+ App Router",
    extension: ".tsx",
    promptHint: `
- Next.js App Router (app directory)
- Server Component by default, add "use client" only if needed
- Use fetch() with Next.js caching
- TypeScript`,
    defaultPath: (pageName) => `app/admin/${pageName}/page.tsx`,
  },
};

export class GeneratorService {
  private repo = new GeneratorRepository();

  async listApis() {
    return this.repo.listApis();
  }

  getAvailableFrameworks() {
    return Object.entries(FRAMEWORK_CONFIGS).map(([key, cfg]) => ({
      key,
      name: cfg.name,
      extension: cfg.extension,
    }));
  }

  async generateUiSchema(api_id: string) {
    const { api, config } = await this.repo.getApiAndConfig(api_id);
    if (!config) {
      throw new Error(
        "api_config not found for this api_id (create api_config first)",
      );
    }

    const prompt = `You are an expert admin UI designer.
Return ONLY valid JSON (no markdown, no comments, no explanation).

Goal: generate a UI schema for an admin CRUD page.

API:
- name: ${api.name}
- method: ${api.method}
- endpoint: ${api.endpoint}
- description: ${api.description ?? ""}

Config:
- auth_required: ${config.auth_required}
- pagination: ${config.pagination}
- searchable: ${config.searchable}
- columns: ${JSON.stringify(config.columns ?? [])}
- filters: ${JSON.stringify(config.filters ?? [])}

Output JSON format:
{
  "pageName": string (camelCase, e.g. "productList"),
  "pageTitle": string (human readable, e.g. "Product Management"),
  "table": {
    "columns": [{ "key": string, "label": string, "type": "text"|"number"|"date"|"boolean"|"image" }],
    "pagination": boolean,
    "searchable": boolean,
    "searchPlaceholder": string
  },
  "form": {
    "fields": [{ "key": string, "label": string, "type": "text"|"number"|"date"|"select"|"textarea", "required": boolean }],
    "submitLabel": string
  },
  "filters": {
    "fields": [{ "key": string, "label": string, "type": "text"|"select"|"date" }]
  },
  "api": {
    "list": string,
    "create": string,
    "update": string,
    "delete": string
  }
}`;

    const raw = await geminiTextForPrompt(prompt);
    const schema_json = JSON.parse(raw);

    const row = await this.repo.insertUISchema(
      config.config_id,
      schema_json,
      `UI schema for ${api.name}`,
    );
    return row;
  }

  async generateCode(schema_id: string, framework: FrameworkKey = "react") {
    const ui = await this.repo.getUISchemaById(schema_id);
    const fwConfig = FRAMEWORK_CONFIGS[framework];

    if (!fwConfig) {
      throw new Error(
        `Unsupported framework: ${framework}. Available: ${Object.keys(FRAMEWORK_CONFIGS).join(", ")}`,
      );
    }

    const prompt = `You are a senior ${fwConfig.name} developer.
Generate code for an admin CRUD page.
Return ONLY code (no markdown fences, no explanation before/after code).

Framework requirements:
${fwConfig.promptHint}

UI Schema:
${JSON.stringify(ui.schema_json, null, 2)}

Additional rules:
- Put API base URL as a constant: const API_BASE = "http://localhost:3000/api";
- Include loading and error states
- Make the UI clean and functional
- Add basic inline styles or CSS classes`;

    const frontend_code = await geminiTextForPrompt(prompt);

    const pageName = ui.schema_json?.pageName ?? "AdminPage";
    const suggestedPath = fwConfig.defaultPath(pageName);

    const config_files = {
      suggestedPath,
      framework,
      frameworkName: fwConfig.name,
      extension: fwConfig.extension,
    };

    const row = await this.repo.insertGeneratedCode(
      schema_id,
      frontend_code,
      config_files,
    );
    return { ...row, suggested_path: suggestedPath };
  }
}
