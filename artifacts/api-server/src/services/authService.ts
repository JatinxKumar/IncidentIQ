import { userRepository } from "../repositories/userRepository";
import { hashPassword, verifyPassword } from "../utils/hash";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import type { z } from "zod";
import type { registerSchema, loginSchema } from "../validators/authValidators";
import type { SafeUser, User } from "@workspace/db";

// Identify database connectivity errors vs application errors
function isDbError(err: any): boolean {
  return (
    err?.message?.startsWith("Failed query:") ||
    err?.code === "ECONNREFUSED" ||
    err?.code === "ENOTFOUND" ||
    err?.errno === -4078
  );
}

export class AuthService {
  async register(data: z.infer<typeof registerSchema>) {
    let existingUser;
    try {
      existingUser = await userRepository.findByEmailOrUsername(data.email, data.username);
    } catch (err: any) {
      if (isDbError(err)) throw new Error("Database unavailable. Please try again later.");
      throw err;
    }

    if (existingUser) {
      if (existingUser.email === data.email) throw new Error("Email already in use");
      if (existingUser.username === data.username) throw new Error("Username already taken");
    }

    const passwordHash = await hashPassword(data.password);

    try {
      const newUser = await userRepository.create({
        email: data.email,
        username: data.username,
        passwordHash,
        role: data.role as "admin" | "analyst" | "viewer",
      });
      const tokens = generateTokens({ id: newUser.id, role: newUser.role });
      return { user: this.sanitizeUser(newUser), ...tokens };
    } catch (err: any) {
      if (isDbError(err)) throw new Error("Database unavailable. Please try again later.");
      throw err;
    }
  }

  async login(data: z.infer<typeof loginSchema>) {
    let user;
    try {
      user = await userRepository.findByEmail(data.email);
    } catch (err: any) {
      if (isDbError(err)) throw new Error("Database unavailable. Please try again later.");
      throw err;
    }

    if (!user) throw new Error("Invalid email or password");

    const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) throw new Error("Invalid email or password");

    try {
      await userRepository.updateLastLogin(user.id);
    } catch {
      // Non-fatal — don't fail login if last_login_at update fails
    }

    const tokens = generateTokens({ id: user.id, role: user.role });
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      return generateTokens({ id: payload.id, role: payload.role });
    } catch {
      throw new Error("Invalid or expired refresh token");
    }
  }

  sanitizeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async getUserById(id: string): Promise<User> {
    try {
      const user = await userRepository.findById(id);
      if (!user) throw new Error('User not found');
      return user;
    } catch (err: any) {
      if (isDbError(err)) throw new Error('Database unavailable. Please try again later.');
      throw err;
    }
  }
}

export const authService = new AuthService();
