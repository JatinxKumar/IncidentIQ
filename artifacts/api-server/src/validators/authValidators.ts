import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
  role: z.enum(["admin", "analyst", "viewer"]).optional().default("viewer"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});
