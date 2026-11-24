import type { Request, Response } from "express";
import { authService } from "../services/authService";
import { registerSchema, loginSchema, refreshTokenSchema } from "../validators/authValidators";
import { ZodError } from "zod";

function getErrorStatus(msg: string): number {
  if (msg?.includes("Database unavailable")) return 503;
  return 400;
}

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);
      if (result.accessToken) {
        res.cookie("accessToken", result.accessToken, { httpOnly: true, secure: false });
      }
      res.status(201).json({ message: "User registered successfully", ...result });
    } catch (error: any) {
      if (error instanceof ZodError) {
        const errorMsg = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("Register validation error:", error.errors);
        res.status(400).json({ error: errorMsg || "Validation Error", details: error.errors });
        return;
      }
      res.status(getErrorStatus(error.message)).json({ error: error.message || "Registration failed" });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data);
      if (result.accessToken) {
        res.cookie("accessToken", result.accessToken, { httpOnly: true, secure: false });
      }
      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof ZodError) {
        const errorMsg = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("Login validation error:", error.errors);
        res.status(400).json({ error: errorMsg || "Validation Error", details: error.errors });
        return;
      }
      const msg = error.message || "Login failed";
      const status = msg.includes("Database unavailable") ? 503 : 401;
      res.status(status).json({ error: msg });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const data = refreshTokenSchema.parse(req.body);
      const tokens = await authService.refresh(data.refreshToken);
      res.status(200).json(tokens);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Validation Error", details: error.errors });
        return;
      }
      res.status(401).json({ error: error.message || "Invalid refresh token" });
    }
  }

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const user = await authService.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json(authService.sanitizeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch user" });
    }
  }
}

export const authController = new AuthController();
