import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "UNAUTHORIZED" });

  try {
    const decoded = verifyAccessToken(token);
    (req as any).developerId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ message: "UNAUTHORIZED" });
  }
}
