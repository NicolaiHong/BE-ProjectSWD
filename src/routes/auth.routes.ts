import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  resetPasswordValidation,
  forgotPasswordValidation,
  verifyOTPValidation,
  resetPasswordWithOTPValidation,
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

// ✅ Forgot Password with OTP endpoints
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validateRequest,
  authController.forgotPassword,
);

router.post(
  "/verify-otp",
  verifyOTPValidation,
  validateRequest,
  authController.verifyOTP,
);

router.post(
  "/reset-password-otp",
  resetPasswordWithOTPValidation,
  validateRequest,
  authController.resetPasswordWithOTP,
);

export default router;
