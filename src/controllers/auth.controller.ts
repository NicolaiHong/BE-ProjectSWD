import { Request, Response, NextFunction } from "express";
import {
  AuthRegisterRequestSchema,
  AuthLoginRequestSchema,
  AuthRefreshRequestSchema,
} from "../dtos";
import { AuthService } from "../services/auth.service";
import { AuthRepository } from "../repositories/auth.repository";
import { BadRequestError, NotFoundError } from "../middlewares/errorHandler";

// Wrapper to handle async controller errors
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class AuthController {
  /**
   * @openapi
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   *     description: Create a new user account with email and password. Returns user info and authentication tokens.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AuthRegisterRequest'
   *           example:
   *             email: "user@example.com"
   *             password: "securePassword123"
   *             displayName: "John Doe"
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: Email already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AuthRegisterRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const body = parseResult.data;
    const result = await AuthService.register(
      body.email,
      body.password,
      body.displayName,
    );
    return res.status(201).json(result);
  });

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login with email/password
   *     description: Authenticate user with email and password. Returns user info and authentication tokens.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AuthLoginRequest'
   *           example:
   *             emailOrUsername: "user@example.com"
   *             password: "securePassword123"
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AuthLoginRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const body = parseResult.data;
    const result = await AuthService.login(body.emailOrUsername, body.password);
    return res.json(result);
  });

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     description: Exchange a valid refresh token for a new access token and refresh token (rotating refresh).
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshRequest'
   *           example:
   *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *     responses:
   *       200:
   *         description: Tokens refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TokensResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Invalid or expired refresh token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static refresh = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AuthRefreshRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const body = parseResult.data;
    const tokens = await AuthService.refresh(body.refreshToken);
    return res.json(tokens);
  });

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout user
   *     description: Revoke the refresh token to log the user out. The access token will remain valid until it expires.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshRequest'
   *           example:
   *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *     responses:
   *       204:
   *         description: Logged out successfully
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AuthRefreshRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw BadRequestError(
        parseResult.error.issues[0]?.message || "Invalid input",
      );
    }
    const body = parseResult.data;
    await AuthService.logout(body.refreshToken);
    return res.status(204).send();
  });

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user profile
   *     description: Retrieve the profile of the currently authenticated user.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserPublicDto'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static me = asyncHandler(async (req: Request, res: Response) => {
    const developerId = (req as any).developerId as string;
    const dev = await AuthRepository.findDeveloperById(developerId);
    if (!dev) throw NotFoundError("User not found");

    return res.json({
      id: dev.id,
      email: dev.email,
      displayName: dev.display_name,
      avatarUrl: dev.avatar_url,
    });
  });

  /**
   * @openapi
   * /auth/google:
   *   get:
   *     tags: [Auth]
   *     summary: Initiate Google OAuth login
   *     description: Redirects to Google consent screen for authentication.
   *     responses:
   *       302:
   *         description: Redirect to Google OAuth consent screen
   */

  /**
   * @openapi
   * /auth/google/callback:
   *   get:
   *     tags: [Auth]
   *     summary: Google OAuth callback
   *     description: Handles the OAuth callback from Google. Creates or links user account and returns tokens.
   *     parameters:
   *       - in: query
   *         name: code
   *         schema:
   *           type: string
   *         description: Authorization code from Google
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *         description: State parameter for CSRF protection
   *     responses:
   *       302:
   *         description: Redirect to frontend with tokens in query params
   *       200:
   *         description: Returns tokens if no frontend redirect URL is configured
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       401:
   *         description: OAuth authentication failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */

  /**
   * @openapi
   * /auth/github:
   *   get:
   *     tags: [Auth]
   *     summary: Initiate GitHub OAuth login
   *     description: Redirects to GitHub consent screen for authentication.
   *     responses:
   *       302:
   *         description: Redirect to GitHub OAuth consent screen
   */

  /**
   * @openapi
   * /auth/github/callback:
   *   get:
   *     tags: [Auth]
   *     summary: GitHub OAuth callback
   *     description: Handles the OAuth callback from GitHub. Creates or links user account and returns tokens.
   *     parameters:
   *       - in: query
   *         name: code
   *         schema:
   *           type: string
   *         description: Authorization code from GitHub
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *         description: State parameter for CSRF protection
   *     responses:
   *       302:
   *         description: Redirect to frontend with tokens in query params
   *       200:
   *         description: Returns tokens if no frontend redirect URL is configured
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       401:
   *         description: OAuth authentication failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */

  static oauthCallback = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.user as any;
    const result = await AuthService.loginOAuth(payload);

    const redirect = process.env.FRONTEND_REDIRECT_URL;
    if (redirect) {
      const url = new URL(redirect);
      url.searchParams.set("accessToken", result.tokens.accessToken);
      url.searchParams.set("refreshToken", result.tokens.refreshToken);
      return res.redirect(url.toString());
    }

    return res.json(result);
  });

  /**
   * @openapi
   * /auth/failed:
   *   get:
   *     tags: [Auth]
   *     summary: OAuth failure endpoint
   *     description: Endpoint reached when OAuth authentication fails.
   *     responses:
   *       401:
   *         description: OAuth authentication failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
}
