import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import * as generatorController from "../controllers/generator.controller";

const router = Router();

// ==================== API CRUD ====================
router.get("/apis", authenticate, generatorController.listApis);
router.post("/apis", authenticate, generatorController.createApi);
router.get("/apis/:id", authenticate, generatorController.getApiById);
router.put("/apis/:id", authenticate, generatorController.updateApi);
router.delete("/apis/:id", authenticate, generatorController.deleteApi);

// ==================== API CONFIG ====================
router.post("/api-config", authenticate, generatorController.createApiConfig);
router.get(
  "/api-config/:api_id",
  authenticate,
  generatorController.getApiConfig,
);
router.put(
  "/api-config/:config_id",
  authenticate,
  generatorController.updateApiConfig,
);

// ==================== FRAMEWORKS ====================
router.get("/frameworks", authenticate, generatorController.listFrameworks);

// ==================== UI SCHEMA ====================
router.get("/ui-schemas", authenticate, generatorController.listUISchemas);
router.post("/ui-schema", authenticate, generatorController.generateUiSchema);
router.get("/ui-schema/:id", authenticate, generatorController.getUISchemaById);
router.delete(
  "/ui-schema/:id",
  authenticate,
  generatorController.deleteUISchema,
);

// ==================== GENERATED CODE ====================
router.get("/codes", authenticate, generatorController.listGeneratedCodes);
router.post("/code", authenticate, generatorController.generateCode);
router.get("/code/:id", authenticate, generatorController.getGeneratedCodeById);
router.delete(
  "/code/:id",
  authenticate,
  generatorController.deleteGeneratedCode,
);

// ==================== HISTORY ====================
router.get("/history", authenticate, generatorController.getHistory);

// ==================== FULL GENERATE ====================
router.post("/generate-full", authenticate, generatorController.generateFull);

export default router;
