import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../utils/errors";

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    throw new TooManyRequestsError("Too many requests, please slow down");
  },
});

/**
 * Strict rate limiter for auth endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: "Too many authentication attempts, please try again later",
  handler: (req, res) => {
    throw new TooManyRequestsError("Too many authentication attempts");
  },
});

/**
 * Moderate rate limiter for resource creation
 * 20 requests per 15 minutes per IP
 */
export const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many creation requests, please slow down",
  handler: (req, res) => {
    throw new TooManyRequestsError("Too many creation requests");
  },
});
