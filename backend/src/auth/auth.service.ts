import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, type User } from "../db/schema.js";
import { env } from "../env.js";

type UserWithoutPassword = Omit<User, "password">;

function stripPassword(user: User): UserWithoutPassword {
  const { password: _, ...rest } = user;
  return rest;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<UserWithoutPassword> {
  // Check if email already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existing.length > 0) {
    throw new Error("EMAIL_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({ email, password: hashedPassword, name })
    .returning();

  return stripPassword(user);
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: UserWithoutPassword }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, user: stripPassword(user) };
}

export async function getUserById(
  id: string
): Promise<UserWithoutPassword | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));

  if (!user) return null;

  return stripPassword(user);
}
