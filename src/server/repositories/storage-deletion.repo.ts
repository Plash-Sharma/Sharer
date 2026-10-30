import { prisma } from "../db/prisma";
import { StorageDeletion } from "@prisma/client";

export class StorageDeletionRepository {
  async enqueue(storageKeys: string[]): Promise<number> {
    if (storageKeys.length === 0) return 0;
    const res = await prisma.storageDeletion.createMany({
      data: storageKeys.map((key) => ({ storageKey: key })),
    });
    return res.count;
  }

  async listPending(limit = 1000): Promise<StorageDeletion[]> {
    return prisma.storageDeletion.findMany({
      where: { attempts: { lt: 5 } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async remove(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await prisma.storageDeletion.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async incrementAttempts(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await prisma.storageDeletion.updateMany({
      where: { id: { in: ids } },
      data: { attempts: { increment: 1 } },
    });
    return res.count;
  }
}

export const storageDeletionRepo = new StorageDeletionRepository();
