import { prisma } from "../db/prisma";
import { ShareLink, Role, Node } from "@prisma/client";

export class LinkRepository {
  async create(data: {
    nodeId: string;
    tokenHash: string;
    role: Role;
    expiresAt: Date;
    createdById: string;
  }): Promise<ShareLink> {
    return prisma.shareLink.create({
      data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<(ShareLink & { node: Node }) | null> {
    return prisma.shareLink.findUnique({
      where: { tokenHash },
      include: { node: true },
    });
  }

  async findById(id: string): Promise<(ShareLink & { node: Node }) | null> {
    return prisma.shareLink.findUnique({
      where: { id },
      include: { node: true },
    });
  }

  async listByNode(nodeId: string): Promise<ShareLink[]> {
    return prisma.shareLink.findMany({
      where: { nodeId },
      orderBy: { createdAt: "desc" },
    });
  }

  async revoke(id: string): Promise<ShareLink> {
    return prisma.shareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async incrementUseCount(id: string): Promise<void> {
    await prisma.shareLink.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });
  }
}

export const linkRepo = new LinkRepository();
