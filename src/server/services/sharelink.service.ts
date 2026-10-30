import { z } from "zod";
import { linkRepo } from "../repositories/link.repo";
import { nodeRepo } from "../repositories/node.repo";
import { permissionRepo } from "../repositories/permission.repo";
import { assertCan } from "../permissions/guard";
import { generateShareToken, hashToken } from "../security/token";
import { rateLimiter } from "../security/ratelimit";
import { defaultStorageProvider } from "../storage/S3StorageProvider";
import { auditService } from "./audit.service";
import { GoneError, NotFoundError, UnprocessableEntityError } from "../errors";
import { Role, NodeType } from "@prisma/client";

export const CreateLinkSchema = z.object({
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
  ttlSeconds: z.number().int().positive().max(7776000, "Maximum link TTL is 90 days"), // 90 days cap
});

export class ShareLinkService {
  async createLink(
    actor: { id: string },
    nodeId: string,
    input: z.infer<typeof CreateLinkSchema>
  ) {
    const data = CreateLinkSchema.parse(input);
    const node = await nodeRepo.findById(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    const grants = await permissionRepo.listForNodeAndAncestors(actor.id, [node.id, ...ancestorIds]);

    assertCan({
      actor,
      action: "create_link",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const rawToken = generateShareToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + data.ttlSeconds * 1000);

    const link = await linkRepo.create({
      nodeId,
      tokenHash,
      role: data.role as Role,
      expiresAt,
      createdById: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      action: "share_link.create",
      nodeId,
      metadata: { linkId: link.id, role: data.role, expiresAt },
    });

    return {
      id: link.id,
      token: rawToken,
      role: link.role,
      expiresAt: link.expiresAt,
      url: `/s/${rawToken}`,
    };
  }

  async resolveLink(rawToken: string, ip?: string) {
    if (ip) {
      rateLimiter.check(`link-resolve:${ip}`, 30, 60);
    }

    const tokenHash = hashToken(rawToken);
    const link = await linkRepo.findByTokenHash(tokenHash);

    if (!link) {
      throw new NotFoundError("Share link not found");
    }

    const now = new Date();
    if (link.revokedAt != null) {
      throw new GoneError("This share link has been revoked by the owner");
    }

    if (link.expiresAt.getTime() <= now.getTime()) {
      throw new GoneError("This share link has expired");
    }

    if (link.node.deletedAt != null) {
      throw new GoneError("The item shared by this link has been deleted");
    }

    // Increment use count
    await linkRepo.incrementUseCount(link.id);

    await auditService.log({
      action: "share_link.access",
      nodeId: link.nodeId,
      ip,
      metadata: { linkId: link.id },
    });

    return {
      link: {
        id: link.id,
        role: link.role,
        expiresAt: link.expiresAt,
      },
      node: link.node,
    };
  }

  async getLinkDownloadUrl(rawToken: string, targetFileId?: string, ip?: string) {
    const { link, node } = await this.resolveLink(rawToken, ip);

    let fileNode = node;
    if (targetFileId && targetFileId !== node.id) {
      const target = await nodeRepo.findById(targetFileId);
      if (!target || !target.path.startsWith(node.path)) {
        throw new NotFoundError("Target file is not within the shared folder");
      }
      fileNode = target;
    }

    if (fileNode.type !== NodeType.FILE || !fileNode.storageKey) {
      throw new UnprocessableEntityError("Cannot download a folder directly");
    }

    // Rule: Link-derived GET TTL capped by link expiry (Section 10 B20)
    const remainingSeconds = Math.max(1, Math.floor((link.expiresAt.getTime() - Date.now()) / 1000));
    const presignTtl = Math.min(60, remainingSeconds);

    const url = await defaultStorageProvider.presignGet(
      fileNode.storageKey,
      fileNode.name,
      fileNode.mimeType || undefined,
      presignTtl
    );

    await auditService.log({
      action: "share_link.download",
      nodeId: fileNode.id,
      ip,
      metadata: { linkId: link.id },
    });

    return { url, filename: fileNode.name };
  }

  async listLinks(actor: { id: string }, nodeId: string) {
    const node = await nodeRepo.findById(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    const grants = await permissionRepo.listForNodeAndAncestors(actor.id, [node.id, ...ancestorIds]);

    assertCan({
      actor,
      action: "create_link",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    return linkRepo.listByNode(nodeId);
  }

  async revokeLink(actor: { id: string }, linkId: string) {
    const link = await linkRepo.findById(linkId);

    if (!link) throw new NotFoundError("Link not found");

    const ancestorIds = link.node.path.split("/").filter((s) => s.length > 0 && s !== link.node.id);
    const grants = await permissionRepo.listForNodeAndAncestors(actor.id, [link.node.id, ...ancestorIds]);

    assertCan({
      actor,
      action: "revoke_link",
      node: link.node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const revoked = await linkRepo.revoke(linkId);

    await auditService.log({
      actorId: actor.id,
      action: "share_link.revoke",
      nodeId: link.nodeId,
      metadata: { linkId },
    });

    return revoked;
  }
}

export const shareLinkService = new ShareLinkService();
