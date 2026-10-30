import { nodeRepo } from "../repositories/node.repo";
import { permissionRepo } from "../repositories/permission.repo";
import { assertCan } from "../permissions/guard";
import { defaultStorageProvider } from "../storage/S3StorageProvider";
import { newStorageKey } from "../storage/keys";
import { storageDeletionRepo } from "../repositories/storage-deletion.repo";
import { auditService } from "./audit.service";
import { ConflictError, NotFoundError } from "../errors";
import { Node, NodeType } from "@prisma/client";

export class ContentService {
  private async loadPermissionsForNode(node: Node, userId: string) {
    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    return permissionRepo.listForNodeAndAncestors(userId, [node.id, ...ancestorIds]);
  }

  async readText(actor: { id: string }, nodeId: string): Promise<{ text: string; node: Node }> {
    const node = await nodeRepo.findById(nodeId);
    if (!node || node.type !== NodeType.FILE || !node.storageKey) {
      throw new NotFoundError("File not found");
    }

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "view",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const buffer = await defaultStorageProvider.getObject(node.storageKey);
    const text = buffer ? buffer.toString("utf-8") : "";

    return { text, node };
  }

  async saveText(
    actor: { id: string },
    nodeId: string,
    content: string,
    clientUpdatedAtIso?: string
  ): Promise<Node> {
    const node = await nodeRepo.findById(nodeId);
    if (!node || node.type !== NodeType.FILE || !node.storageKey) {
      throw new NotFoundError("File not found");
    }

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "edit",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    // Concurrency conflict check: prevent last-write-wins data loss (Section 10 B15)
    if (clientUpdatedAtIso) {
      const clientDate = new Date(clientUpdatedAtIso).getTime();
      const serverDate = new Date(node.updatedAt).getTime();
      if (Math.abs(clientDate - serverDate) > 1000) {
        throw new ConflictError("File has been modified by another session. Please reload to view changes.");
      }
    }

    // Immutable object rule (Section 4.4):
    // Write NEW object with NEW key to MinIO
    const newKey = newStorageKey();
    const buffer = Buffer.from(content, "utf-8");
    const mime = node.mimeType || "text/plain";

    const { etag } = await defaultStorageProvider.putObject(newKey, buffer, mime);

    // Swap storageKey in DB and enqueue old key into StorageDeletion outbox
    const oldKey = node.storageKey;
    const updated = await nodeRepo.update(nodeId, {
      storageKey: newKey,
      size: BigInt(buffer.length),
      etag,
    });

    await storageDeletionRepo.enqueue([oldKey]);

    await auditService.log({
      actorId: actor.id,
      action: "file.edit_content",
      nodeId,
      metadata: { newKey, size: buffer.length },
    });

    return updated;
  }
}

export const contentService = new ContentService();
