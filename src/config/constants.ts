import dotenv from "dotenv";

dotenv.config();
//JWT Tokens
const jwtAccessToken = process.env.JWT_ACCESS_TOKEN;
const jwtRefreshToken = process.env.JWT_REFRESH_TOKEN;

if (!jwtAccessToken) {
  throw new Error("JWT_ACCESS_TOKEN is required in environment variables");
}

if (!jwtRefreshToken) {
  throw new Error("JWT_REFRESH_TOKEN is required in environment variables");
}

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "ai_idea_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  },

  jwt: {
    secret: jwtAccessToken,
    refreshSecret: jwtRefreshToken,
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "",
    user: process.env.EMAIL_USER || "",
    password: process.env.EMAIL_PASSWORD || "",
  },

  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || ""),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || ""),
  },
};
