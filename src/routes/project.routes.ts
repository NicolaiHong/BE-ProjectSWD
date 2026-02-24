import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import { requireAuth } from "../middlewares/authJwt";

export const projectRouter = Router();

// All project routes require authentication
projectRouter.use(requireAuth);

projectRouter.get("/", ProjectController.list);
projectRouter.get("/:id", ProjectController.getById);
projectRouter.post("/", ProjectController.create);
projectRouter.put("/:id", ProjectController.update);
projectRouter.delete("/:id", ProjectController.delete);
