import { z } from "zod";
import { nodeRepo } from "../repositories/node.repo";
import { permissionRepo } from "../repositories/permission.repo";
import { assertCan } from "../permissions/guard";
import { sanitizeFilename } from "../security/sanitize-filename";
import { getSafeResponseContentType } from "../security/mime";
import { newStorageKey } from "../storage/keys";
import { defaultStorageProvider } from "../storage/S3StorageProvider";
import { auditService } from "./audit.service";
import { NotFoundError, UnprocessableEntityError } from "../errors";
import { NodeType, UploadStatus, Node } from "@prisma/client";

export const UploadInitSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  mimeType: z.string().max(100).optional(),
});

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 104857600); // 100 MB

export class UploadService {
  private async loadPermissionsForNode(node: Node, userId: string) {
    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    return permissionRepo.listForNodeAndAncestors(userId, [node.id, ...ancestorIds]);
  }

  async init(
    actor: { id: string },
    input: z.infer<typeof UploadInitSchema>
  ): Promise<{ nodeId: string; uploadUrl: string; storageKey: string; name: string }> {
    const data = UploadInitSchema.parse(input);

    if (data.size > MAX_UPLOAD_BYTES) {
      throw new UnprocessableEntityError(
        `File size exceeds maximum allowed upload size (${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`
      );
    }

    const parentId = data.parentId || null;
    let parentPath = "/";
    let depth = 0;

    if (parentId) {
      const parent = await nodeRepo.findById(parentId);
      if (!parent) throw new NotFoundError("Parent folder not found");

      const grants = await this.loadPermissionsForNode(parent, actor.id);
      assertCan({
        actor,
        action: "upload",
        node: parent,
        grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
      });

      parentPath = parent.path;
      depth = parent.depth + 1;
    }

    const safeMime = getSafeResponseContentType(data.mimeType);
    const cleanName = sanitizeFilename(data.name);

    // Auto-suffix collision
    let candidate = cleanName;
    let count = 1;
    const lastDot = cleanName.lastIndexOf(".");
    const baseName = lastDot > 0 ? cleanName.substring(0, lastDot) : cleanName;
    const ext = lastDot > 0 ? cleanName.substring(lastDot) : "";

    while (await nodeRepo.findByNameAndParent(candidate, parentId, actor.id)) {
      candidate = `${baseName} (${count})${ext}`;
      count++;
    }

    const storageKey = newStorageKey();

    const node = await nodeRepo.create({
      ownerId: actor.id,
      parentId,
      type: NodeType.FILE,
      name: candidate,
      path: parentPath, // temporary
      depth,
      mimeType: safeMime,
      size: BigInt(data.size),
      storageKey,
      bucket: process.env.S3_BUCKET || "drivelite-files",
      uploadStatus: UploadStatus.PENDING,
    });

    const finalPath = `${parentPath}${node.id}/`;
    await nodeRepo.update(node.id, { path: finalPath });

    const uploadUrl = await defaultStorageProvider.presignPut(storageKey, data.size, safeMime);

    await auditService.log({
      actorId: actor.id,
      action: "upload.init",
      nodeId: node.id,
      metadata: { name: candidate, size: data.size, storageKey },
    });

    return {
      nodeId: node.id,
      uploadUrl,
      storageKey,
      name: candidate,
    };
  }

  async complete(actor: { id: string }, nodeId: string): Promise<Node> {
    const node = await nodeRepo.findById(nodeId);
    if (!node || !node.storageKey) throw new NotFoundError("Upload not found");

    if (node.uploadStatus !== UploadStatus.PENDING) {
      return node; // Already completed
    }

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "upload",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    // Verify object with HEAD in S3/MinIO
    const meta = await defaultStorageProvider.head(node.storageKey);
    if (!meta) {
      await nodeRepo.update(nodeId, { uploadStatus: UploadStatus.FAILED });
      throw new UnprocessableEntityError("Uploaded object not found in storage");
    }

    const updated = await nodeRepo.update(nodeId, {
      uploadStatus: UploadStatus.READY,
      etag: meta.etag,
      size: BigInt(meta.contentLength),
    });

    await auditService.log({
      actorId: actor.id,
      action: "upload.complete",
      nodeId,
      metadata: { etag: meta.etag, size: meta.contentLength },
    });

    return updated;
  }

  async abort(actor: { id: string }, nodeId: string): Promise<void> {
    const node = await nodeRepo.findById(nodeId);
    if (!node) return;

    if (node.storageKey) {
      try {
        await defaultStorageProvider.deleteObject(node.storageKey);
      } catch (err) {
        console.error("Failed to delete aborted object:", err);
      }
    }

    await nodeRepo.deleteById(nodeId);

    await auditService.log({
      actorId: actor.id,
      action: "upload.abort",
      nodeId,
    });
  }

  async getDownloadUrl(
    actor: { id: string },
    nodeId: string,
    ttlSeconds = 60
  ): Promise<{ url: string; filename: string }> {
    const node = await nodeRepo.findById(nodeId);
    if (!node || node.type !== NodeType.FILE || !node.storageKey) {
      throw new NotFoundError("File not found");
    }

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "download",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const url = await defaultStorageProvider.presignGet(
      node.storageKey,
      node.name,
      node.mimeType || undefined,
      ttlSeconds
    );

    await auditService.log({
      actorId: actor.id,
      action: "file.download",
      nodeId,
    });

    return { url, filename: node.name };
  }
}

export const uploadService = new UploadService();
