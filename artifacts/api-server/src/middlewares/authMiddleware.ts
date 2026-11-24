import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../utils/jwt";

// Augment Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) || req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ error: "Authentication token required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
