import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

const routesPath = path.join(__dirname, "../routes/*.ts");
const controllersPath = path.join(__dirname, "../controllers/*.ts");

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AI Idea API",
      version: "1.0.0",
      description:
        "Backend API for AI Idea application with authentication and project management.",
    },
    tags: [
      {
        name: "Auth",
        description:
          "Authentication endpoints - register, login, OAuth, token management",
      },
      {
        name: "Projects",
        description: "CRUD operations for managing projects",
      },
      {
        name: "Documents",
        description:
          "Manage project documents (OpenAPI, Entity Schema, Action Spec, Design System)",
      },
      {
        name: "Sessions",
        description: "AI code generation sessions",
      },
      {
        name: "APIs",
        description: "CRUD operations for managing API definitions",
      },
      {
        name: "API Configs",
        description: "Manage configuration key-value pairs for APIs",
      },
      {
        name: "UI Schemas",
        description: "Manage UI schema definitions for APIs",
      },
      {
        name: "Generated Codes",
        description: "View and manage AI-generated code files",
      },
      {
        name: "Deployments",
        description: "Manage deployment records for APIs",
      },
      {
        name: "Generate",
        description:
          "Simple AI code generation endpoint for VS Code Extension",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token for authenticated requests",
        },
      },
    },
  },
  apis: [routesPath, controllersPath],
});
