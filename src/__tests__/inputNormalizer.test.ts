/**
 * Unit tests for normalizeGenerationInputs
 *
 * Test cases from the implementation plan:
 * 1. Only OPENAPI.yaml - should still run
 * 2. Only OPENAPI.yaml + UI config - should still run
 * 3. All 3 typed docs - should still run (backward compatibility)
 * 4. Missing typed docs but fallback can infer - should still run
 * 5. No input at all - should fail
 * 6. File parse error - should fail with correct message
 */

import {
  normalizeGenerationInputs,
  normalizedInputsToDocuments,
  type DocumentInput,
  type GenerationConfig,
} from "../ai/inputNormalizer";

// Sample OpenAPI spec for testing
const SAMPLE_OPENAPI = JSON.stringify({
  openapi: "3.0.3",
  info: {
    title: "Products API",
    version: "1.0.0",
  },
  paths: {
    "/products": {
      get: {
        summary: "List products",
        tags: ["products"],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProductList" },
              },
            },
          },
        },
      },
      post: {
        summary: "Create product",
        tags: ["products"],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProductRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Product" },
              },
            },
          },
        },
      },
    },
    "/products/{id}": {
      get: {
        summary: "Get product by ID",
        tags: ["products"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Product" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: "object",
        required: ["id", "name", "price"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", description: "Product name" },
          price: { type: "number", format: "double" },
          category: { type: "string" },
          description: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateProductRequest: {
        type: "object",
        required: ["name", "price"],
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          category: { type: "string" },
          description: { type: "string" },
        },
      },
      ProductList: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Product" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
        },
      },
    },
  },
});

const SAMPLE_ENTITY_SCHEMA = JSON.stringify({
  entities: [
    {
      name: "Product",
      fields: [
        { name: "id", type: "UUID", required: true },
        { name: "name", type: "string", required: true },
        { name: "price", type: "number", required: true },
      ],
    },
  ],
});

const SAMPLE_ACTION_SPEC =
  "Create a product management dashboard with CRUD table, search, and filters";

const SAMPLE_DESIGN_SYSTEM = JSON.stringify({
  name: "Modern Minimal",
  colors: { primary: "#3b82f6", secondary: "#6366f1" },
});

describe("normalizeGenerationInputs", () => {
  // Test Case 1: Only OPENAPI.yaml
  describe("Case A: Only OPENAPI.yaml provided", () => {
    it("should derive ENTITY_SCHEMA from OpenAPI", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
      ];

      const result = normalizeGenerationInputs(docs, {});

      expect(result.hasUsableInput).toBe(true);
      expect(result.openApi).toBe(SAMPLE_OPENAPI);
      expect(result.entitySchema).not.toBeNull();
      expect(result.sourceMetadata.entitySchemaSource).toBe("openapi");
    });

    it("should derive ACTION_SPEC from OpenAPI paths", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
      ];

      const result = normalizeGenerationInputs(docs, {});

      expect(result.actionSpec).not.toBeNull();
      expect(result.sourceMetadata.actionSpecSource).toBe("openapi");

      // Verify derived action spec contains action metadata
      const parsed = JSON.parse(result.actionSpec!);
      expect(parsed.actions).toBeDefined();
      expect(parsed.actions.length).toBeGreaterThan(0);
      expect(parsed.derivedFrom).toBe("openapi");
    });

    it("should provide default DESIGN_SYSTEM", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
      ];

      const result = normalizeGenerationInputs(docs, {});

      expect(result.designSystem).not.toBeNull();
      expect(result.sourceMetadata.designSystemSource).toBe("default");

      // Verify default design system has required structure
      const parsed = JSON.parse(result.designSystem!);
      expect(parsed.name).toBeDefined();
      expect(parsed.colors).toBeDefined();
    });
  });

  // Test Case 2: OPENAPI.yaml + UI config
  describe("Case B: OPENAPI.yaml + UI configuration", () => {
    it("should use config-based DESIGN_SYSTEM when promptEnhancement is provided", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
      ];
      const config: GenerationConfig = {
        promptEnhancement: "Use Skill: ui-ux-pro-max",
      };

      const result = normalizeGenerationInputs(docs, config);

      expect(result.hasUsableInput).toBe(true);
      expect(result.designSystem).not.toBeNull();
      expect(result.sourceMetadata.designSystemSource).toBe("config");

      const parsed = JSON.parse(result.designSystem!);
      expect(parsed.name).toContain("UI/UX Pro");
    });

    it("should use config-based DESIGN_SYSTEM when designConfiguration is provided", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
      ];
      const config: GenerationConfig = {
        designConfiguration: "Modern minimalist with subtle shadows",
      };

      const result = normalizeGenerationInputs(docs, config);

      expect(result.hasUsableInput).toBe(true);
      expect(result.sourceMetadata.designSystemSource).toBe("config");

      const parsed = JSON.parse(result.designSystem!);
      expect(parsed.visualGuidelines).toBeDefined();
      expect(
        parsed.visualGuidelines.some(
          (g: string) => g.includes("minimal") || g.includes("shadow"),
        ),
      ).toBe(true);
    });

    it("should include customPrompt in ACTION_SPEC", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
      ];
      const config: GenerationConfig = {
        customPrompt: "Focus on the dashboard view with analytics",
      };

      const result = normalizeGenerationInputs(docs, config);

      expect(result.actionSpec).not.toBeNull();
      const parsed = JSON.parse(result.actionSpec!);
      expect(parsed.customInstructions).toBe(
        "Focus on the dashboard view with analytics",
      );
    });
  });

  // Test Case 3: All typed docs provided (backward compatibility)
  describe("Case C: All typed documents provided", () => {
    it("should use explicit documents over derived ones", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
        { type: "ENTITY_SCHEMA", content: SAMPLE_ENTITY_SCHEMA },
        { type: "ACTION_SPEC", content: SAMPLE_ACTION_SPEC },
        { type: "DESIGN_SYSTEM", content: SAMPLE_DESIGN_SYSTEM },
      ];

      const result = normalizeGenerationInputs(docs, {});

      expect(result.hasUsableInput).toBe(true);
      expect(result.entitySchema).toBe(SAMPLE_ENTITY_SCHEMA);
      expect(result.actionSpec).toBe(SAMPLE_ACTION_SPEC);
      expect(result.designSystem).toBe(SAMPLE_DESIGN_SYSTEM);
      expect(result.sourceMetadata.entitySchemaSource).toBe("document");
      expect(result.sourceMetadata.actionSpecSource).toBe("document");
      expect(result.sourceMetadata.designSystemSource).toBe("document");
    });
  });

  // Test Case 4: Missing typed docs but fallback can infer
  describe("Case D: Missing typed docs with fallback inference", () => {
    it("should derive missing docs from OpenAPI even with partial typed docs", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: SAMPLE_OPENAPI },
        { type: "DESIGN_SYSTEM", content: SAMPLE_DESIGN_SYSTEM },
      ];

      const result = normalizeGenerationInputs(docs, {});

      expect(result.hasUsableInput).toBe(true);
      expect(result.entitySchema).not.toBeNull();
      expect(result.actionSpec).not.toBeNull();
      expect(result.designSystem).toBe(SAMPLE_DESIGN_SYSTEM);
      expect(result.sourceMetadata.entitySchemaSource).toBe("openapi");
      expect(result.sourceMetadata.actionSpecSource).toBe("openapi");
      expect(result.sourceMetadata.designSystemSource).toBe("document");
    });
  });

  // Test Case 5: No input at all
  describe("Case E: No usable input", () => {
    it("should fail when no documents are provided", () => {
      const result = normalizeGenerationInputs([], {});

      expect(result.hasUsableInput).toBe(false);
      expect(result.openApi).toBeNull();
      expect(result.entitySchema).toBeNull();
      expect(result.actionSpec).toBeNull();
    });

    it("should fail when only config is provided without documents", () => {
      const config: GenerationConfig = {
        designConfiguration: "Modern design",
      };

      const result = normalizeGenerationInputs([], config);

      expect(result.hasUsableInput).toBe(false);
    });

    it("should succeed when only customPrompt is provided as action spec source", () => {
      const config: GenerationConfig = {
        customPrompt: "Create a dashboard",
      };

      const result = normalizeGenerationInputs([], config);

      // This is a borderline case - customPrompt alone provides actionSpec
      // but without entity info, generation quality would be poor
      // The plan says "has usable input" when there's at least 1 source
      expect(result.actionSpec).toBe("Create a dashboard");
      expect(result.sourceMetadata.actionSpecSource).toBe("prompt");
      // hasUsableInput should be true since we have at least something
      expect(result.hasUsableInput).toBe(true);
    });
  });

  // Test Case 6: Invalid/unparseable OpenAPI
  describe("Case F: Parse error handling", () => {
    it("should not derive from invalid JSON OpenAPI", () => {
      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: "{ invalid json" },
      ];

      const result = normalizeGenerationInputs(docs, {});

      // Content is stored but nothing is derived
      expect(result.openApi).toBe("{ invalid json");
      expect(result.entitySchema).toBeNull();
      expect(result.actionSpec).toBeNull();
      expect(result.sourceMetadata.entitySchemaSource).toBe("none");
      expect(result.sourceMetadata.actionSpecSource).toBe("none");
    });

    it("should not derive from OpenAPI without schemas", () => {
      const emptyOpenApi = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Empty", version: "1.0" },
        paths: {},
      });

      const docs: DocumentInput[] = [
        { type: "OPENAPI", content: emptyOpenApi },
      ];

      const result = normalizeGenerationInputs(docs, {});

      expect(result.openApi).not.toBeNull();
      expect(result.entitySchema).toBeNull();
      expect(result.sourceMetadata.entitySchemaSource).toBe("none");
    });
  });
});

describe("normalizedInputsToDocuments", () => {
  it("should convert normalized inputs back to document array", () => {
    const docs: DocumentInput[] = [
      {
        type: "OPENAPI",
        content: SAMPLE_OPENAPI,
        name: "API Spec",
        sha256: "abc123",
      },
    ];

    const normalized = normalizeGenerationInputs(docs, {});
    const result = normalizedInputsToDocuments(normalized, docs);

    expect(result.length).toBe(4); // OpenAPI + derived EntitySchema + derived ActionSpec + default DesignSystem
    expect(result.find((d) => d.type === "OPENAPI")?.sha256).toBe("abc123");
    expect(result.find((d) => d.type === "ENTITY_SCHEMA")?.name).toContain(
      "[derived]",
    );
    expect(result.find((d) => d.type === "ACTION_SPEC")?.name).toContain(
      "[derived]",
    );
    expect(result.find((d) => d.type === "DESIGN_SYSTEM")?.name).toContain(
      "[derived]",
    );
  });

  it("should preserve original documents when they exist", () => {
    const docs: DocumentInput[] = [
      { type: "OPENAPI", content: SAMPLE_OPENAPI },
      {
        type: "ENTITY_SCHEMA",
        content: SAMPLE_ENTITY_SCHEMA,
        name: "Custom Entity Schema",
      },
    ];

    const normalized = normalizeGenerationInputs(docs, {});
    const result = normalizedInputsToDocuments(normalized, docs);

    const entityDoc = result.find((d) => d.type === "ENTITY_SCHEMA");
    expect(entityDoc?.name).toBe("Custom Entity Schema");
    expect(entityDoc?.content).toBe(SAMPLE_ENTITY_SCHEMA);
  });
});

describe("Entity Schema derivation quality", () => {
  it("should extract all entity types from schemas", () => {
    const docs: DocumentInput[] = [
      { type: "OPENAPI", content: SAMPLE_OPENAPI },
    ];

    const result = normalizeGenerationInputs(docs, {});
    const parsed = JSON.parse(result.entitySchema!);

    // Should have Product, CreateProductRequest, ProductList, Pagination, ErrorResponse
    const entityNames = parsed.entities.map((e: any) => e.name);
    expect(entityNames).toContain("Product");
    expect(entityNames).toContain("Pagination");
  });

  it("should preserve field requirements and types", () => {
    const docs: DocumentInput[] = [
      { type: "OPENAPI", content: SAMPLE_OPENAPI },
    ];

    const result = normalizeGenerationInputs(docs, {});
    const parsed = JSON.parse(result.entitySchema!);

    const product = parsed.entities.find((e: any) => e.name === "Product");
    expect(product).toBeDefined();

    const idField = product.fields.find((f: any) => f.name === "id");
    expect(idField?.required).toBe(true);
    expect(idField?.type).toBe("UUID");

    const priceField = product.fields.find((f: any) => f.name === "price");
    expect(priceField?.required).toBe(true);
    expect(priceField?.type).toBe("number");
  });
});

describe("Action Spec derivation quality", () => {
  it("should extract actions from all HTTP methods", () => {
    const docs: DocumentInput[] = [
      { type: "OPENAPI", content: SAMPLE_OPENAPI },
    ];

    const result = normalizeGenerationInputs(docs, {});
    const parsed = JSON.parse(result.actionSpec!);

    const methods = parsed.actions.map((a: any) => a.method);
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
  });

  it("should include parameter information", () => {
    const docs: DocumentInput[] = [
      { type: "OPENAPI", content: SAMPLE_OPENAPI },
    ];

    const result = normalizeGenerationInputs(docs, {});
    const parsed = JSON.parse(result.actionSpec!);

    const listAction = parsed.actions.find(
      (a: any) => a.path === "/products" && a.method === "GET",
    );
    expect(listAction?.parameters).toBeDefined();
    expect(listAction?.parameters?.length).toBeGreaterThan(0);

    const searchParam = listAction?.parameters?.find(
      (p: any) => p.name === "search",
    );
    expect(searchParam).toBeDefined();
    expect(searchParam?.in).toBe("query");
  });
});
