import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import * as generatorController from "../controllers/generator.controller";

const router = Router();

router.get("/apis", authenticate, generatorController.listApis);
router.get("/frameworks", authenticate, generatorController.listFrameworks); // NEW
router.post("/ui-schema", authenticate, generatorController.generateUiSchema);
router.post("/code", authenticate, generatorController.generateCode);

export default router;
