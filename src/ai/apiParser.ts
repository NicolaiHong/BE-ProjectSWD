import yaml from "js-yaml";

export interface ParsedEntity {
  name: string;
  properties: { name: string; type: string; required: boolean }[];
}

export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
}

export interface ParsedApiResult {
  entities: ParsedEntity[];
  endpoints: ParsedEndpoint[];
  availableActions: string[];
}

const HTTP_METHOD_TO_ACTION: Record<string, string> = {
  GET: "read",
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
};

export class ApiParser {
  /**
   * Parse OpenAPI spec (YAML or JSON) and extract entities, endpoints, and available actions
   */
  static parse(content: string): ParsedApiResult {
    const spec = this.parseSpec(content);
    if (!spec) {
      return { entities: [], endpoints: [], availableActions: [] };
    }

    const entities = this.extractEntities(spec);
    const endpoints = this.extractEndpoints(spec);
    const availableActions = this.extractActions(endpoints);

    return { entities, endpoints, availableActions };
  }

  /**
   * Parse OpenAPI content (supports both JSON and YAML)
   */
  private static parseSpec(content: string): any | null {
    // Try JSON first
    try {
      return JSON.parse(content);
    } catch {}

    // Try YAML
    try {
      return yaml.load(content) as any;
    } catch {
      console.warn("[ApiParser] Failed to parse API spec as JSON or YAML");
      return null;
    }
  }

  /**
   * Extract entities from OpenAPI components/schemas
   */
  private static extractEntities(spec: any): ParsedEntity[] {
    const schemas = spec?.components?.schemas || spec?.definitions || {};
    const entities: ParsedEntity[] = [];

    for (const [name, schema] of Object.entries<any>(schemas)) {
      // Skip internal/reference schemas
      if (name.startsWith("_") || !schema || typeof schema !== "object") {
        continue;
      }

      const properties: ParsedEntity["properties"] = [];
      const required = new Set(schema.required || []);

      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries<any>(
          schema.properties,
        )) {
          properties.push({
            name: propName,
            type: this.resolveType(propSchema),
            required: required.has(propName),
          });
        }
      }

      entities.push({ name, properties });
    }

    return entities;
  }

  /**
   * Resolve OpenAPI type to simple type string
   */
  private static resolveType(schema: any): string {
    if (!schema) return "unknown";

    if (schema.$ref) {
      // Extract type name from $ref
      const ref = schema.$ref.split("/").pop() || "unknown";
      return ref;
    }

    if (schema.type === "array") {
      const itemType = this.resolveType(schema.items);
      return `${itemType}[]`;
    }

    if (schema.type === "object") {
      return "object";
    }

    if (schema.enum) {
      return schema.enum.map((v: any) => `"${v}"`).join(" | ");
    }

    return schema.type || "unknown";
  }

  /**
   * Extract endpoints from OpenAPI paths
   */
  private static extractEndpoints(spec: any): ParsedEndpoint[] {
    const paths = spec?.paths || {};
    const endpoints: ParsedEndpoint[] = [];
    const httpMethods = new Set([
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "options",
      "head",
    ]);

    for (const [path, pathItem] of Object.entries<any>(paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      for (const [method, operation] of Object.entries<any>(pathItem)) {
        if (!httpMethods.has(method.toLowerCase())) continue;

        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation?.operationId,
          summary: operation?.summary,
          tags: operation?.tags,
        });
      }
    }

    return endpoints;
  }

  /**
   * Extract available actions from endpoints
   * Maps HTTP methods to CRUD actions
   */
  private static extractActions(endpoints: ParsedEndpoint[]): string[] {
    const actions = new Set<string>();

    for (const endpoint of endpoints) {
      const action = HTTP_METHOD_TO_ACTION[endpoint.method];
      if (action) {
        actions.add(action);
      }
    }

    return Array.from(actions);
  }

  /**
   * Generate a summary of the API for prompts
   */
  static generateSummary(result: ParsedApiResult): string {
    const lines: string[] = [];

    if (result.entities.length > 0) {
      lines.push(`**Entities (${result.entities.length}):**`);
      for (const entity of result.entities.slice(0, 10)) {
        const props = entity.properties
          .slice(0, 5)
          .map((p) => p.name)
          .join(", ");
        lines.push(
          `- ${entity.name}: ${props}${entity.properties.length > 5 ? "..." : ""}`,
        );
      }
      if (result.entities.length > 10) {
        lines.push(`- ... and ${result.entities.length - 10} more`);
      }
    }

    if (result.endpoints.length > 0) {
      lines.push("");
      lines.push(`**Endpoints (${result.endpoints.length}):**`);
      for (const ep of result.endpoints.slice(0, 10)) {
        lines.push(
          `- ${ep.method} ${ep.path}${ep.summary ? ` - ${ep.summary}` : ""}`,
        );
      }
      if (result.endpoints.length > 10) {
        lines.push(`- ... and ${result.endpoints.length - 10} more`);
      }
    }

    if (result.availableActions.length > 0) {
      lines.push("");
      lines.push(
        `**Available Actions:** ${result.availableActions.join(", ")}`,
      );
    }

    return lines.join("\n");
  }
}
