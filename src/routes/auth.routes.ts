import { Router } from "express";
import { passport } from "../config/passport";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/authJwt";

export const authRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     AuthRegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address (will be normalized to lowercase)
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: User password (minimum 8 characters)
 *           example: "securePassword123"
 *         displayName:
 *           type: string
 *           maxLength: 100
 *           description: User display name
 *           example: "John Doe"
 *     AuthLoginRequest:
 *       type: object
 *       required:
 *         - emailOrUsername
 *         - password
 *       properties:
 *         emailOrUsername:
 *           type: string
 *           description: User email address
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: User password
 *           example: "securePassword123"
 *     RefreshRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token received from login or previous refresh
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     UserPublicDto:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User unique identifier
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: User email address
 *           example: "user@example.com"
 *         displayName:
 *           type: string
 *           nullable: true
 *           description: User display name
 *           example: "John Doe"
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: User avatar URL
 *           example: "https://example.com/avatar.jpg"
 *     TokensResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT access token (short-lived)
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token (long-lived, for token rotation)
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/UserPublicDto'
 *         tokens:
 *           $ref: '#/components/schemas/TokensResponse'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             statusCode:
 *               type: integer
 *               description: HTTP status code
 *               example: 400
 *             message:
 *               type: string
 *               description: Error message
 *               example: "Invalid input"
 *             stack:
 *               type: string
 *               description: Stack trace (only in development)
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Error timestamp
 *           example: "2026-02-03T12:00:00.000Z"
 */

// Local Auth Routes
authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/refresh", AuthController.refresh);
authRouter.post("/logout", AuthController.logout);

// Protected Routes
authRouter.get("/me", requireAuth, AuthController.me);

// OAuth: Google
authRouter.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  }),
);
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failed",
  }),
  AuthController.oauthCallback,
);

// OAuth: GitHub
authRouter.get(
  "/github",
  passport.authenticate("github", {
    session: false,
    scope: ["user:email"],
  }),
);
authRouter.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/auth/failed",
  }),
  AuthController.oauthCallback,
);

// OAuth Failure Handler
authRouter.get("/failed", (_req, res) =>
  res.status(401).json({
    success: false,
    error: {
      statusCode: 401,
      message: "OAUTH_FAILED",
    },
    timestamp: new Date().toISOString(),
  }),
);
