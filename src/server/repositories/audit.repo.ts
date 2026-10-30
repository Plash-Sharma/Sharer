import { prisma } from "../db/prisma";
import { AuditLog, Prisma } from "@prisma/client";

export class AuditRepository {
  async log(data: {
    actorId?: string | null;
    action: string;
    nodeId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ip?: string | null;
  }): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        actorId: data.actorId || null,
        action: data.action,
        nodeId: data.nodeId || null,
        metadata: data.metadata || Prisma.JsonNull,
        ip: data.ip || null,
      },
    });
  }

  async listByNode(nodeId: string, limit = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { nodeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async listByActor(actorId: string, limit = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export const auditRepo = new AuditRepository();
