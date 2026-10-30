import { prisma } from "../db/prisma";
import { User } from "@prisma/client";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: { email: string; name?: string | null; passwordHash: string }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        name: data.name?.trim() || null,
        passwordHash: data.passwordHash,
      },
    });
  }

  async searchByEmail(query: string, limit = 10): Promise<Array<Pick<User, "id" | "email" | "name">>> {
    return prisma.user.findMany({
      where: {
        email: {
          contains: query.toLowerCase().trim(),
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      take: limit,
    });
  }
}

export const userRepo = new UserRepository();
