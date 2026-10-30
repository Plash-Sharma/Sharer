import { z } from "zod";
import { nodeRepo } from "../repositories/node.repo";
import { permissionRepo } from "../repositories/permission.repo";
import { assertCan } from "../permissions/guard";
import { sanitizeFilename } from "../security/sanitize-filename";
import { auditService } from "./audit.service";
import { NotFoundError, UnprocessableEntityError } from "../errors";
import { Node, NodeType } from "@prisma/client";
import { Role as AppRole } from "../permissions/roles";

export const CreateFolderSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
});

export const RenameNodeSchema = z.object({
  name: z.string().min(1).max(255),
});

export const MoveNodeSchema = z.object({
  newParentId: z.string().uuid().nullable(),
});

export class NodeService {
  private async loadPermissionsForNode(node: Node, userId: string) {
    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    return permissionRepo.listForNodeAndAncestors(userId, [node.id, ...ancestorIds]);
  }

  async getUniqueName(
    desiredName: string,
    parentId: string | null,
    ownerId: string,
    type: NodeType
  ): Promise<string> {
    let candidate = sanitizeFilename(desiredName);
    let count = 1;

    const lastDot = candidate.lastIndexOf(".");
    const baseName = type === NodeType.FILE && lastDot > 0 ? candidate.substring(0, lastDot) : candidate;
    const extension = type === NodeType.FILE && lastDot > 0 ? candidate.substring(lastDot) : "";

    while (await nodeRepo.findByNameAndParent(candidate, parentId, ownerId)) {
      candidate = `${baseName} (${count})${extension}`;
      count++;
    }

    return candidate;
  }

  async createFolder(
    actor: { id: string },
    input: z.infer<typeof CreateFolderSchema>
  ): Promise<Node> {
    const data = CreateFolderSchema.parse(input);
    const parentId = data.parentId || null;

    let parentPath = "/";
    let depth = 0;

    if (parentId) {
      const parent = await nodeRepo.findById(parentId);
      if (!parent) {
        throw new NotFoundError("Parent folder not found");
      }

      // Check upload/create permission on parent folder
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

    const uniqueName = await this.getUniqueName(data.name, parentId, actor.id, NodeType.FOLDER);

    // Initial node creation with dummy path, then update with real materialized path
    const node = await nodeRepo.create({
      ownerId: actor.id,
      parentId,
      type: NodeType.FOLDER,
      name: uniqueName,
      path: parentPath, // temporary placeholder
      depth,
    });

    // Materialized path: parent.path + id + '/'
    const finalPath = `${parentPath}${node.id}/`;
    const finalNode = await nodeRepo.update(node.id, { path: finalPath });

    await auditService.log({
      actorId: actor.id,
      action: "node.create_folder",
      nodeId: finalNode.id,
      metadata: { name: finalNode.name, parentId },
    });

    return finalNode;
  }

  async rename(
    actor: { id: string },
    id: string,
    input: z.infer<typeof RenameNodeSchema>
  ): Promise<Node> {
    const data = RenameNodeSchema.parse(input);
    const node = await nodeRepo.findById(id);
    if (!node) throw new NotFoundError("Node not found");

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "rename",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const cleanName = sanitizeFilename(data.name);
    if (cleanName === node.name) return node;

    const uniqueName = await this.getUniqueName(cleanName, node.parentId, node.ownerId, node.type);
    const updated = await nodeRepo.update(id, { name: uniqueName });

    await auditService.log({
      actorId: actor.id,
      action: "node.rename",
      nodeId: id,
      metadata: { oldName: node.name, newName: uniqueName },
    });

    return updated;
  }

  async move(
    actor: { id: string },
    id: string,
    input: z.infer<typeof MoveNodeSchema>
  ): Promise<Node> {
    const data = MoveNodeSchema.parse(input);
    const node = await nodeRepo.findById(id);
    if (!node) throw new NotFoundError("Node not found");

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "move",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const newParentId = data.newParentId;
    let newParentPath = "/";
    let newParentDepth = -1;

    if (newParentId) {
      if (newParentId === id) {
        throw new UnprocessableEntityError("Cannot move an item into itself");
      }

      const newParent = await nodeRepo.findById(newParentId);
      if (!newParent) throw new NotFoundError("Destination folder not found");
      if (newParent.type !== NodeType.FOLDER) {
        throw new UnprocessableEntityError("Destination must be a folder");
      }

      // Check upload permission into destination folder
      const destGrants = await this.loadPermissionsForNode(newParent, actor.id);
      assertCan({
        actor,
        action: "upload",
        node: newParent,
        grants: destGrants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
      });

      // Section 10 B4: Cycle Check - Cannot move folder into its own descendant!
      if (node.type === NodeType.FOLDER && newParent.path.startsWith(node.path)) {
        throw new UnprocessableEntityError("Cannot move a folder into its own subfolder");
      }

      newParentPath = newParent.path;
      newParentDepth = newParent.depth;
    }

    const uniqueName = await this.getUniqueName(node.name, newParentId, node.ownerId, node.type);
    if (uniqueName !== node.name) {
      await nodeRepo.update(id, { name: uniqueName });
    }

    const moved = await nodeRepo.moveSubtree(id, node.path, newParentPath, newParentDepth);

    await auditService.log({
      actorId: actor.id,
      action: "node.move",
      nodeId: id,
      metadata: { oldParentId: node.parentId, newParentId },
    });

    return moved;
  }

  async softDelete(actor: { id: string }, id: string): Promise<number> {
    const node = await nodeRepo.findById(id);
    if (!node) throw new NotFoundError("Node not found");

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "delete",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const count = await nodeRepo.softDeleteSubtree(node.path);

    await auditService.log({
      actorId: actor.id,
      action: "node.delete",
      nodeId: id,
      metadata: { deletedCount: count },
    });

    return count;
  }

  async restore(actor: { id: string }, id: string): Promise<number> {
    const node = await nodeRepo.findById(id);
    if (!node) throw new NotFoundError("Node not found");

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "restore",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const count = await nodeRepo.restoreSubtree(node.path);

    await auditService.log({
      actorId: actor.id,
      action: "node.restore",
      nodeId: id,
      metadata: { restoredCount: count },
    });

    return count;
  }

  async purge(actor: { id: string }, id: string): Promise<{ deletedCount: number; purgedStorageKeys: string[] }> {
    const node = await nodeRepo.findById(id);
    if (!node) throw new NotFoundError("Node not found");

    const grants = await this.loadPermissionsForNode(node, actor.id);
    assertCan({
      actor,
      action: "purge",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const result = await nodeRepo.purgeSubtree(node.path);

    await auditService.log({
      actorId: actor.id,
      action: "node.purge",
      nodeId: id,
      metadata: result,
    });

    return result;
  }

  async getNode(actor: { id: string }, id: string): Promise<{ node: Node; effectiveRole: AppRole }> {
    const node = await nodeRepo.findById(id);
    if (!node) throw new NotFoundError("Node not found");

    const grants = await this.loadPermissionsForNode(node, actor.id);
    const { effectiveRole } = assertCan({
      actor,
      action: "view",
      node,
      grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    return { node, effectiveRole };
  }

  async getAncestors(actor: { id: string }, path: string): Promise<Array<Pick<Node, "id" | "name" | "type" | "path">>> {
    const ancestors = await nodeRepo.getAncestors(path);
    return ancestors.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      path: a.path,
    }));
  }

  async listChildren(
    actor: { id: string },
    parentId: string | null,
    options: {
      cursor?: string;
      limit?: number;
      sort?: "name_asc" | "name_desc" | "updated_desc" | "size_desc";
      searchQuery?: string;
    }
  ): Promise<{ items: Node[]; nextCursor: string | null; currentFolder?: Node | null }> {
    let currentFolder: Node | null = null;

    if (parentId) {
      currentFolder = await nodeRepo.findById(parentId);
      if (!currentFolder) throw new NotFoundError("Folder not found");

      const grants = await this.loadPermissionsForNode(currentFolder, actor.id);
      assertCan({
        actor,
        action: "list",
        node: currentFolder,
        grants: grants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
      });
    }

    const { items, nextCursor } = await nodeRepo.listChildren({
      parentId,
      ownerId: parentId === null ? actor.id : undefined,
      ...options,
    });

    return { items, nextCursor, currentFolder };
  }

  async listTrashed(actor: { id: string }): Promise<Node[]> {
    return nodeRepo.listTrashed(actor.id);
  }
}

export const nodeService = new NodeService();
