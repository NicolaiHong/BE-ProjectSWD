/**
 * Input Normalizer - derives missing generation inputs from available sources.
 *
 * Priority hierarchy:
 * 1. Explicit typed documents (ENTITY_SCHEMA, ACTION_SPEC, DESIGN_SYSTEM)
 * 2. Derived from OpenAPI (ENTITY_SCHEMA, ACTION_SPEC)
 * 3. Derived from UI configuration (DESIGN_SYSTEM, ACTION_SPEC enhancement)
 * 4. Default fallbacks
 */

import yaml from "js-yaml";

export interface GenerationConfig {
  promptEnhancement?: string;
  designConfiguration?: string;
  customPrompt?: string;
}

export interface DocumentInput {
  type: string;
  content: string;
  name?: string;
  sha256?: string | null;
}

export interface NormalizedInputs {
  entitySchema: string | null;
  actionSpec: string | null;
  designSystem: string | null;
  openApi: string | null;
  hasUsableInput: boolean;
  sourceMetadata: {
    entitySchemaSource: "document" | "openapi" | "none";
    actionSpecSource: "document" | "openapi" | "prompt" | "none";
    designSystemSource: "document" | "config" | "default" | "none";
    openApiSource: "document" | "none";
  };
}

/**
 * Design presets from UI configuration selections
 */
const DESIGN_PRESETS: Record<string, object> = {
  modern_minimalist_subtle_shadows: {
    name: "Modern Minimalist",
    colors: { primary: "#1a1a2e", secondary: "#16213e", background: "#ffffff" },
    typography: {
      fontFamily: "Inter, system-ui, sans-serif",
      headingFont: "Inter, sans-serif",
    },
    spacing: { unit: 4 },
    borderRadius: "8px",
    visualGuidelines: [
      "minimal layout",
      "modern spacing",
      "subtle shadows",
      "clean typography",
      "low visual clutter",
    ],
  },
  "ui-ux-pro-max": {
    name: "UI/UX Pro Max",
    colors: { primary: "#3b82f6", secondary: "#8b5cf6", background: "#ffffff" },
    typography: {
      fontFamily: "Inter, system-ui, sans-serif",
      headingFont: "Inter, sans-serif",
    },
    spacing: { unit: 4 },
    borderRadius: "8px",
    visualGuidelines: [
      "professional layout",
      "optimal spacing",
      "modern shadows",
      "accessible typography",
      "intuitive navigation",
    ],
  },
  default: {
    name: "Default Design System",
    colors: { primary: "#3b82f6", secondary: "#6366f1", background: "#ffffff" },
    typography: { fontFamily: "system-ui, sans-serif", headingFont: "inherit" },
    spacing: { unit: 4 },
    borderRadius: "6px",
    visualGuidelines: ["clean layout", "standard spacing", "subtle elevation"],
  },
};

/**
 * Parse OpenAPI content (JSON or YAML)
 */
function parseOpenApi(content: string): Record<string, any> | null {
  try {
    return JSON.parse(content);
  } catch {
    try {
      return yaml.load(content) as Record<string, any>;
    } catch {
      return null;
    }
  }
}

/**
 * Derive ENTITY_SCHEMA from OpenAPI document
 */
function deriveEntitySchemaFromOpenApi(
  spec: Record<string, any>,
): string | null {
  const schemas = spec.components?.schemas || spec.definitions || {};
  if (Object.keys(schemas).length === 0) {
    return null;
  }

  const entities: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
      format?: string;
      ref?: string;
      enum?: string[];
    }>;
    description?: string;
  }> = [];

  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    if (!schemaDef || typeof schemaDef !== "object") continue;

    const schema = schemaDef as Record<string, any>;

    // Skip non-object schemas
    if (schema.type && schema.type !== "object" && !schema.properties) {
      continue;
    }

    const requiredFields: string[] = schema.required || [];
    const properties: Record<string, any> = schema.properties || {};
    const fields: (typeof entities)[0]["fields"] = [];

    for (const [propName, propDef] of Object.entries(properties)) {
      if (!propDef || typeof propDef !== "object") continue;

      const prop = propDef as Record<string, any>;
      const field: (typeof fields)[0] = {
        name: propName,
        type: resolveType(prop),
        required: requiredFields.includes(propName),
      };

      if (prop.description) field.description = prop.description;
      if (prop.format) field.format = prop.format;
      if (prop.enum) field.enum = prop.enum;

      const ref = prop.$ref || prop.items?.$ref;
      if (ref) field.ref = extractRefName(ref);

      fields.push(field);
    }

    if (fields.length > 0) {
      entities.push({
        name: schemaName,
        fields,
        description: schema.description,
      });
    }
  }

  if (entities.length === 0) {
    return null;
  }

  return JSON.stringify({ entities }, null, 2);
}

/**
 * Derive ACTION_SPEC from OpenAPI document
 */
function deriveActionSpecFromOpenApi(
  spec: Record<string, any>,
  customPrompt?: string,
): string | null {
  const paths = spec.paths || {};
  if (Object.keys(paths).length === 0) {
    return customPrompt || null;
  }

  const actions: Array<{
    resource: string;
    action: string;
    method: string;
    path: string;
    description?: string;
    parameters?: Array<{
      name: string;
      in: string;
      type: string;
      required: boolean;
    }>;
    responseType?: string;
  }> = [];

  for (const [pathKey, pathValue] of Object.entries(paths)) {
    if (!pathValue || typeof pathValue !== "object") continue;

    const httpMethods = ["get", "post", "put", "patch", "delete"];

    for (const method of httpMethods) {
      const op = (pathValue as Record<string, any>)[method];
      if (!op) continue;

      // Infer resource from path (e.g., /products -> products)
      const resource =
        pathKey
          .split("/")
          .filter((p) => p && !p.startsWith("{"))
          .pop() || "resource";

      // Infer action from method
      const actionMap: Record<string, string> = {
        get: pathKey.includes("{")
          ? `get ${resource} by id`
          : `list ${resource}`,
        post: `create ${resource}`,
        put: `update ${resource}`,
        patch: `partial update ${resource}`,
        delete: `delete ${resource}`,
      };

      const parameters: (typeof actions)[0]["parameters"] = [];
      if (Array.isArray(op.parameters)) {
        for (const param of op.parameters) {
          parameters.push({
            name: param.name,
            in: param.in,
            type: param.schema?.type || param.type || "string",
            required: param.required ?? false,
          });
        }
      }

      // Get response type from 200/201 response
      let responseType: string | undefined;
      const successResponse = op.responses?.["200"] || op.responses?.["201"];
      if (successResponse?.content?.["application/json"]?.schema?.$ref) {
        responseType = extractRefName(
          successResponse.content["application/json"].schema.$ref,
        );
      }

      actions.push({
        resource,
        action: actionMap[method] || `${method} ${resource}`,
        method: method.toUpperCase(),
        path: pathKey,
        description: op.summary || op.description,
        parameters: parameters.length > 0 ? parameters : undefined,
        responseType,
      });
    }
  }

  if (actions.length === 0) {
    return customPrompt || null;
  }

  const actionSpec: {
    actions: typeof actions;
    customInstructions?: string;
    derivedFrom: string;
  } = {
    actions,
    derivedFrom: "openapi",
  };

  if (customPrompt) {
    actionSpec.customInstructions = customPrompt;
  }

  return JSON.stringify(actionSpec, null, 2);
}

/**
 * Build DESIGN_SYSTEM from configuration or preset
 */
function buildDesignSystemFromConfig(config: GenerationConfig): string {
  const { promptEnhancement, designConfiguration } = config;

  // Try to match a preset
  let preset = DESIGN_PRESETS["default"];

  if (designConfiguration) {
    const normalizedConfig = designConfiguration
      .toLowerCase()
      .replace(/\s+/g, "_");
    // Look for matching preset
    for (const [key, value] of Object.entries(DESIGN_PRESETS)) {
      if (normalizedConfig.includes(key) || key.includes(normalizedConfig)) {
        preset = value;
        break;
      }
    }

    // If no preset match, create a custom one based on keywords
    if (preset === DESIGN_PRESETS["default"]) {
      preset = buildCustomDesignFromDescription(designConfiguration);
    }
  }

  if (promptEnhancement) {
    const normalizedEnhancement = promptEnhancement
      .toLowerCase()
      .replace(/\s+/g, "-");
    if (normalizedEnhancement.includes("ui-ux-pro")) {
      preset = DESIGN_PRESETS["ui-ux-pro-max"];
    }
  }

  return JSON.stringify(preset, null, 2);
}

/**
 * Build a custom design system from a description string
 */
function buildCustomDesignFromDescription(description: string): object {
  const lower = description.toLowerCase();

  const colors = {
    primary: lower.includes("dark") ? "#1a1a2e" : "#3b82f6",
    secondary: lower.includes("vibrant") ? "#ec4899" : "#6366f1",
    background: lower.includes("dark") ? "#0f0f0f" : "#ffffff",
  };

  const guidelines: string[] = [];
  if (lower.includes("minimal")) guidelines.push("minimal layout");
  if (lower.includes("modern")) guidelines.push("modern spacing");
  if (lower.includes("shadow")) guidelines.push("subtle shadows");
  if (lower.includes("clean")) guidelines.push("clean typography");
  if (guidelines.length === 0) guidelines.push("standard layout");

  return {
    name: "Custom Design System",
    colors,
    typography: {
      fontFamily: "system-ui, sans-serif",
      headingFont: "inherit",
    },
    spacing: { unit: 4 },
    borderRadius: lower.includes("rounded") ? "12px" : "6px",
    visualGuidelines: guidelines,
    sourceDescription: description,
  };
}

function resolveType(prop: Record<string, any>): string {
  if (prop.$ref) {
    return extractRefName(prop.$ref);
  }

  const base = prop.type || "any";

  if (base === "array") {
    if (prop.items?.$ref) {
      return `${extractRefName(prop.items.$ref)}[]`;
    }
    return `${prop.items?.type || "any"}[]`;
  }

  if (prop.format) {
    const formatMap: Record<string, string> = {
      "date-time": "DateTime",
      date: "Date",
      uuid: "UUID",
      email: "string",
      uri: "string",
      int32: "integer",
      int64: "bigint",
      float: "number",
      double: "number",
    };
    return formatMap[prop.format] || base;
  }

  return base;
}

function extractRefName(ref: string): string {
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

/**
 * Main normalization function
 *
 * Takes documents and configuration, returns normalized generation inputs
 * with derived values where explicit ones are missing.
 */
export function normalizeGenerationInputs(
  documents: DocumentInput[],
  config: GenerationConfig = {},
): NormalizedInputs {
  const docByType = new Map<string, DocumentInput>();
  for (const doc of documents) {
    docByType.set(doc.type.toUpperCase(), doc);
  }

  const result: NormalizedInputs = {
    entitySchema: null,
    actionSpec: null,
    designSystem: null,
    openApi: null,
    hasUsableInput: false,
    sourceMetadata: {
      entitySchemaSource: "none",
      actionSpecSource: "none",
      designSystemSource: "none",
      openApiSource: "none",
    },
  };

  // 1. Check for explicit OpenAPI document
  const openApiDoc = docByType.get("OPENAPI");
  let parsedOpenApi: Record<string, any> | null = null;

  if (openApiDoc) {
    result.openApi = openApiDoc.content;
    result.sourceMetadata.openApiSource = "document";
    parsedOpenApi = parseOpenApi(openApiDoc.content);
  }

  // 2. Entity Schema - priority: explicit doc > derived from OpenAPI
  const entitySchemaDoc = docByType.get("ENTITY_SCHEMA");
  if (entitySchemaDoc) {
    result.entitySchema = entitySchemaDoc.content;
    result.sourceMetadata.entitySchemaSource = "document";
  } else if (parsedOpenApi) {
    const derived = deriveEntitySchemaFromOpenApi(parsedOpenApi);
    if (derived) {
      result.entitySchema = derived;
      result.sourceMetadata.entitySchemaSource = "openapi";
    }
  }

  // 3. Action Spec - priority: explicit doc > derived from OpenAPI + prompt
  const actionSpecDoc = docByType.get("ACTION_SPEC");
  if (actionSpecDoc) {
    result.actionSpec = actionSpecDoc.content;
    result.sourceMetadata.actionSpecSource = "document";
  } else if (parsedOpenApi) {
    const derived = deriveActionSpecFromOpenApi(
      parsedOpenApi,
      config.customPrompt,
    );
    if (derived) {
      result.actionSpec = derived;
      result.sourceMetadata.actionSpecSource = "openapi";
    }
  } else if (config.customPrompt) {
    // Use custom prompt as action spec when no OpenAPI
    result.actionSpec = config.customPrompt;
    result.sourceMetadata.actionSpecSource = "prompt";
  }

  // 4. Design System - priority: explicit doc > config-based > default
  const designSystemDoc = docByType.get("DESIGN_SYSTEM");
  if (designSystemDoc) {
    result.designSystem = designSystemDoc.content;
    result.sourceMetadata.designSystemSource = "document";
  } else if (config.promptEnhancement || config.designConfiguration) {
    result.designSystem = buildDesignSystemFromConfig(config);
    result.sourceMetadata.designSystemSource = "config";
  } else {
    // Always provide a default design system
    result.designSystem = JSON.stringify(DESIGN_PRESETS["default"], null, 2);
    result.sourceMetadata.designSystemSource = "default";
  }

  // 5. Determine if we have usable input
  // We need at least OpenAPI OR (some custom prompt that can guide generation)
  result.hasUsableInput =
    result.openApi !== null ||
    result.entitySchema !== null ||
    (result.actionSpec !== null && config.customPrompt !== undefined);

  return result;
}

/**
 * Convert normalized inputs back to document array format
 * for compatibility with existing orchestrator code
 */
export function normalizedInputsToDocuments(
  normalized: NormalizedInputs,
  originalDocs: DocumentInput[],
): DocumentInput[] {
  const docs: DocumentInput[] = [];

  // Keep original OpenAPI if present
  const originalOpenApi = originalDocs.find(
    (d) => d.type.toUpperCase() === "OPENAPI",
  );
  if (originalOpenApi) {
    docs.push(originalOpenApi);
  }

  // Add entity schema (original or derived)
  if (normalized.entitySchema) {
    const originalEntity = originalDocs.find(
      (d) => d.type.toUpperCase() === "ENTITY_SCHEMA",
    );
    docs.push(
      originalEntity || {
        type: "ENTITY_SCHEMA",
        content: normalized.entitySchema,
        name: `[derived] Entity Schema`,
      },
    );
  }

  // Add action spec (original or derived)
  if (normalized.actionSpec) {
    const originalAction = originalDocs.find(
      (d) => d.type.toUpperCase() === "ACTION_SPEC",
    );
    docs.push(
      originalAction || {
        type: "ACTION_SPEC",
        content: normalized.actionSpec,
        name: `[derived] Action Spec`,
      },
    );
  }

  // Add design system (original, config-based, or default)
  if (normalized.designSystem) {
    const originalDesign = originalDocs.find(
      (d) => d.type.toUpperCase() === "DESIGN_SYSTEM",
    );
    docs.push(
      originalDesign || {
        type: "DESIGN_SYSTEM",
        content: normalized.designSystem,
        name: `[derived] Design System`,
      },
    );
  }

  return docs;
}
