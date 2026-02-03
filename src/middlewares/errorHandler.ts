import { Request, Response, NextFunction } from "express";

// Custom Error class cho REST API
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory methods
export const BadRequestError = (message = "Bad Request") =>
  new ApiError(400, message);
export const UnauthorizedError = (message = "Unauthorized") =>
  new ApiError(401, message);
export const ForbiddenError = (message = "Forbidden") =>
  new ApiError(403, message);
export const NotFoundError = (message = "Not Found") =>
  new ApiError(404, message);
export const ConflictError = (message = "Conflict") =>
  new ApiError(409, message);
export const InternalError = (message = "Internal Server Error") =>
  new ApiError(500, message, false);

// 404 Not Found Handler - cho routes không tồn tại
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const error = new ApiError(
    404,
    `Route ${req.method} ${req.originalUrl} not found`,
  );
  next(error);
}

// Global Error Handler - xử lý tất cả errors
export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Default values
  let statusCode = 500;
  let message = "Internal Server Error";
  let stack: string | undefined;

  // Nếu là ApiError (lỗi do mình throw)
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Các lỗi validation từ express-validator hoặc Zod
  else if (err.name === "ValidationError" || err.name === "ZodError") {
    statusCode = 400;
    message = err.message;
  }
  // JWT errors
  else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
  }
  // Prisma errors
  else if (err.name === "PrismaClientKnownRequestError") {
    statusCode = 400;
    message = "Database operation failed";
  }
  // Các lỗi khác
  else if (err instanceof Error) {
    message = err.message;
  }

  // Chỉ show stack trace trong development
  if (process.env.NODE_ENV !== "production") {
    stack = err.stack;
  }

  // Log error (trong production nên dùng logger như Winston/Pino)
  console.error(`[ERROR] ${statusCode} - ${message}`, err);

  // Response theo chuẩn REST API
  res.status(statusCode).json({
    success: false,
    error: {
      statusCode,
      message,
      ...(stack && { stack }),
    },
    timestamp: new Date().toISOString(),
  });
}
