import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { config } from "./config/constants";
import { swaggerSpec } from "./config/swagger";
import { passport } from "./config/passport";

import { authRouter } from "./routes/auth.routes";
import { projectRouter } from "./routes/project.routes";
import { documentRouter } from "./routes/document.routes";
import { sessionRouter } from "./routes/session.routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app = express();

app.use(morgan("dev"));

app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/api/projects", projectRouter);
app.use("/api/projects", documentRouter);
app.use("/api/projects", sessionRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server http://localhost:${config.port}`);
  console.log(`Swagger http://localhost:${config.port}/docs`);
  console.log(`Health  http://localhost:${config.port}/health`);
});

export default app;
