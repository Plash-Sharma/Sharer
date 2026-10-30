import { auditRepo } from "../repositories/audit.repo";
import { Prisma } from "@prisma/client";

export class AuditService {
  async log(params: {
    actorId?: string | null;
    action: string;
    nodeId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ip?: string | null;
  }) {
    try {
      await auditRepo.log(params);
    } catch (err) {
      // Never crash a user action due to audit failure, but log to console
      console.error("[AuditService Error]:", err);
    }
  }
}

export const auditService = new AuditService();
