import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/constants";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./routes/auth.routes";
import cors from "cors";
import yaml from "js-yaml";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import generatorRoutes from "./routes/generator.routes";

const app = express();
//set up cors
app.use(
  cors({
    origin: [
      "http://localhost:3001", // React dev server
      "http://localhost:3000", // Next.js dev server
      "http://localhost:5173", // Vite dev server
      "http://localhost:8080", // Vue dev server
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//expose swagger spec in json format
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

//expose swagger spec in yaml format
app.get("/swagger.yaml", (req, res) => {
  res.setHeader("Content-Type", "text/yaml");
  res.send(yaml.dump(swaggerSpec));
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/generator", generatorRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📚 Swagger docs: http://localhost:${config.port}/api-docs`);
  console.log(`🏥 Health check: http://localhost:${config.port}/health`);
  console.log(`⬇ Swagger JSON: http://localhost:${config.port}/swagger.json`);
  console.log(`⬇ Swagger YAML: http://localhost:${config.port}/swagger.yaml`);
});

export default app;
