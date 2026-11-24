import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import type { User, InsertUser } from "@workspace/db";

export class UserRepository {
  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return result[0];
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result[0];
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    return result[0];
  }

  async findByEmailOrUsername(email: string, username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, email), eq(usersTable.username, username)))
      .limit(1);
    return result[0];
  }

  async create(user: InsertUser): Promise<User> {
    const result = await db.insert(usersTable).values(user).returning();
    return result[0];
  }

  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, id));
  }
}

export const userRepository = new UserRepository();
