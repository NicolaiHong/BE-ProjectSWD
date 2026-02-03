import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "./errorHandler";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return next(UnauthorizedError("Authorization token is required"));
  }

  try {
    const decoded = verifyAccessToken(token);
    (req as any).developerId = decoded.sub;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return next(UnauthorizedError("Token has expired"));
    }
    return next(UnauthorizedError("Invalid token"));
  }
}
