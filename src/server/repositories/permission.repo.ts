import { prisma } from "../db/prisma";
import { Permission, Role, Node, User } from "@prisma/client";

export interface PermissionWithUser extends Permission {
  user: Pick<User, "id" | "email" | "name">;
}

export class PermissionRepository {
  async findByNodeAndUser(nodeId: string, userId: string): Promise<Permission | null> {
    return prisma.permission.findUnique({
      where: {
        nodeId_userId: {
          nodeId,
          userId,
        },
      },
    });
  }

  async listByNode(nodeId: string): Promise<PermissionWithUser[]> {
    return prisma.permission.findMany({
      where: { nodeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listForNodeAndAncestors(userId: string, nodeIds: string[]): Promise<Permission[]> {
    if (nodeIds.length === 0) return [];
    return prisma.permission.findMany({
      where: {
        userId,
        nodeId: { in: nodeIds },
      },
    });
  }

  async upsert(nodeId: string, userId: string, role: Role, grantedById: string): Promise<Permission> {
    return prisma.permission.upsert({
      where: {
        nodeId_userId: { nodeId, userId },
      },
      update: {
        role,
        grantedById,
      },
      create: {
        nodeId,
        userId,
        role,
        grantedById,
      },
    });
  }

  async delete(nodeId: string, userId: string): Promise<void> {
    await prisma.permission.deleteMany({
      where: { nodeId, userId },
    });
  }

  /**
   * For the "Shared with me" view (Section 1.1 F9, Phase 6):
   * Return only topmost shared nodes. If a folder is shared, its children should not be listed as separate items.
   */
  async listTopLevelSharedNodes(userId: string): Promise<Array<Node & { permissionRole: Role; ownerEmail: string }>> {
    // 1. Get all nodes where user has direct permission
    const permissions = await prisma.permission.findMany({
      where: { userId },
      include: {
        node: {
          include: {
            owner: { select: { email: true } },
          },
        },
      },
    });

    const activeNodes = permissions
      .filter((p) => p.node.deletedAt === null)
      .map((p) => ({
        ...p.node,
        permissionRole: p.role,
        ownerEmail: p.node.owner.email,
      }));

    // Filter to only topmost nodes: keep node X if no other node Y in activeNodes is an ancestor of X
    const topLevel = activeNodes.filter((candidate) => {
      return !activeNodes.some(
        (other) => other.id !== candidate.id && candidate.path.startsWith(other.path)
      );
    });

    return topLevel;
  }
}

export const permissionRepo = new PermissionRepository();
