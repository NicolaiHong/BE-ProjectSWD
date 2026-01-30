import { config } from "../config/constants";

interface OTPData {
  otp: string;
  email: string;
  expiresAt: Date;
  attempts: number;
}

export class OTPService {
  // In-memory store for OTPs (in production, use Redis or database)
  private otpStore: Map<string, OTPData> = new Map();

  generateOTP(): string {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }

  storeOTP(email: string, otp: string): void {
    const expiresAt = new Date(
      Date.now() + config.otp.expiresInMinutes * 60 * 1000,
    );

    this.otpStore.set(email.toLowerCase(), {
      otp,
      email: email.toLowerCase(),
      expiresAt,
      attempts: 0,
    });

    // Auto cleanup after expiration
    setTimeout(
      () => {
        this.otpStore.delete(email.toLowerCase());
      },
      config.otp.expiresInMinutes * 60 * 1000,
    );
  }

  verifyOTP(email: string, otp: string): { valid: boolean; message: string } {
    const otpData = this.otpStore.get(email.toLowerCase());

    if (!otpData) {
      return {
        valid: false,
        message: "OTP not found or expired. Please request a new one.",
      };
    }

    // Check if max attempts exceeded
    if (otpData.attempts >= config.otp.maxAttempts) {
      this.otpStore.delete(email.toLowerCase());
      return {
        valid: false,
        message: "Maximum OTP attempts exceeded. Please request a new one.",
      };
    }

    // Check expiration
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(email.toLowerCase());
      return {
        valid: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // Check OTP match
    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      return {
        valid: false,
        message: `Invalid OTP. ${config.otp.maxAttempts - otpData.attempts} attempts remaining.`,
      };
    }

    // OTP is valid - remove it from store
    this.otpStore.delete(email.toLowerCase());
    return { valid: true, message: "OTP verified successfully" };
  }

  hasValidOTP(email: string): boolean {
    const otpData = this.otpStore.get(email.toLowerCase());
    if (!otpData) return false;
    return new Date() <= otpData.expiresAt;
  }
}

// Singleton instance
export const otpService = new OTPService();
