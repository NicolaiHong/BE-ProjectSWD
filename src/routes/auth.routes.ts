import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  resetPasswordValidation,
  validateRequest,
} from "../middlewares/validation";

const router = Router();

router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register,
);

router.post("/login", loginValidation, validateRequest, authController.login);

// ✅ New refresh token endpoint
router.post(
  "/refresh",
  refreshTokenValidation,
  validateRequest,
  authController.refreshToken,
);

router.post("/logout", authenticate, authController.logout);

router.post(
  "/reset-password",
  resetPasswordValidation,
  validateRequest,
  authController.resetPassword,
);

export default router;
