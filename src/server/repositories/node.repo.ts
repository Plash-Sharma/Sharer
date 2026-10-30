import { prisma } from "../db/prisma";
import { Node, NodeType, UploadStatus, Prisma } from "@prisma/client";

export interface ListChildrenOptions {
  parentId: string | null;
  ownerId?: string;
  cursor?: string;
  limit?: number;
  sort?: "name_asc" | "name_desc" | "updated_desc" | "size_desc";
  includeTrashed?: boolean;
  searchQuery?: string;
}

export class NodeRepository {
  async findById(id: string): Promise<Node | null> {
    return prisma.node.findUnique({
      where: { id },
    });
  }

  async findByStorageKey(storageKey: string): Promise<Node | null> {
    return prisma.node.findUnique({
      where: { storageKey },
    });
  }

  async findByNameAndParent(
    name: string,
    parentId: string | null,
    ownerId: string,
    includeTrashed = false
  ): Promise<Node | null> {
    return prisma.node.findFirst({
      where: {
        name,
        parentId,
        ownerId,
        ...(includeTrashed ? {} : { deletedAt: null }),
      },
    });
  }

  async create(data: {
    ownerId: string;
    parentId: string | null;
    type: NodeType;
    name: string;
    path: string;
    depth: number;
    mimeType?: string | null;
    size?: bigint | null;
    storageKey?: string | null;
    bucket?: string | null;
    etag?: string | null;
    uploadStatus?: UploadStatus | null;
  }): Promise<Node> {
    return prisma.node.create({
      data,
    });
  }

  async update(id: string, data: Prisma.NodeUpdateInput): Promise<Node> {
    return prisma.node.update({
      where: { id },
      data,
    });
  }

  async listChildren(options: ListChildrenOptions): Promise<{ items: Node[]; nextCursor: string | null }> {
    const {
      parentId,
      ownerId,
      cursor,
      limit = 50,
      sort = "name_asc",
      includeTrashed = false,
      searchQuery,
    } = options;

    const where: Prisma.NodeWhereInput = {
      ...(includeTrashed ? { deletedAt: { not: null } } : { deletedAt: null }),
      // All listings MUST filter out incomplete uploads per Section 4.2:
      OR: [{ type: NodeType.FOLDER }, { uploadStatus: UploadStatus.READY }],
    };

    if (searchQuery) {
      where.name = { contains: searchQuery, mode: "insensitive" };
      if (ownerId) where.ownerId = ownerId;
    } else {
      where.parentId = parentId;
      if (ownerId && parentId === null) {
        where.ownerId = ownerId;
      }
    }

    let orderBy: Prisma.NodeOrderByWithRelationInput[] = [];
    switch (sort) {
      case "name_desc":
        orderBy = [{ type: "asc" }, { name: "desc" }, { id: "asc" }];
        break;
      case "updated_desc":
        orderBy = [{ type: "asc" }, { updatedAt: "desc" }, { id: "asc" }];
        break;
      case "size_desc":
        orderBy = [{ type: "asc" }, { size: "desc" }, { id: "asc" }];
        break;
      case "name_asc":
      default:
        orderBy = [{ type: "asc" }, { name: "asc" }, { id: "asc" }];
        break;
    }

    const items = await prisma.node.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    return { items, nextCursor };
  }

  async getAncestors(path: string): Promise<Node[]> {
    // path is e.g. "/id1/id2/id3/"
    const ids = path.split("/").filter((s) => s.length > 0);
    if (ids.length === 0) return [];

    const nodes = await prisma.node.findMany({
      where: { id: { in: ids } },
    });

    // Sort to match order in path from root to leaf
    const idMap = new Map(nodes.map((n) => [n.id, n]));
    return ids.map((id) => idMap.get(id)).filter((n): n is Node => n !== undefined);
  }

  async moveSubtree(
    nodeId: string,
    oldPath: string,
    newParentPath: string,
    newParentDepth: number
  ): Promise<Node> {
    return prisma.$transaction(async (tx) => {
      const node = await tx.node.findUniqueOrThrow({ where: { id: nodeId } });
      const newPath = `${newParentPath}${node.id}/`;
      const newDepth = newParentDepth + 1;
      const depthDelta = newDepth - node.depth;

      // 1. Update the node itself
      const updated = await tx.node.update({
        where: { id: nodeId },
        data: {
          parentId: newParentPath === "/" ? null : newParentPath.split("/").filter(Boolean).pop(),
          path: newPath,
          depth: newDepth,
        },
      });

      // 2. Update all descendants if folder
      if (node.type === NodeType.FOLDER) {
        // Rewrite paths using raw query for performance and atomicity
        await tx.$executeRaw`
          UPDATE nodes
          SET path = ${newPath} || SUBSTRING(path FROM ${oldPath.length + 1}),
              depth = depth + ${depthDelta}
          WHERE path LIKE ${oldPath + "%"} AND id != ${nodeId}::uuid
        `;
      }

      return updated;
    });
  }

  async softDeleteSubtree(path: string): Promise<number> {
    const now = new Date();
    const result = await prisma.node.updateMany({
      where: {
        path: { startsWith: path },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
      },
    });
    return result.count;
  }

  async restoreSubtree(path: string): Promise<number> {
    const result = await prisma.node.updateMany({
      where: {
        path: { startsWith: path },
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
      },
    });
    return result.count;
  }

  /**
   * Purge removes node rows permanently from DB and enqueues their S3 storageKeys
   * into StorageDeletion transactional outbox inside the same transaction.
   */
  async purgeSubtree(path: string): Promise<{ deletedCount: number; purgedStorageKeys: string[] }> {
    return prisma.$transaction(async (tx) => {
      // Find all file storage keys under this path
      const files = await tx.node.findMany({
        where: {
          path: { startsWith: path },
          type: NodeType.FILE,
          storageKey: { not: null },
        },
        select: { storageKey: true },
      });

      const storageKeys = files
        .map((f) => f.storageKey)
        .filter((k): k is string => k !== null && k.length > 0);

      // Enqueue to StorageDeletion outbox
      if (storageKeys.length > 0) {
        await tx.storageDeletion.createMany({
          data: storageKeys.map((key) => ({ storageKey: key })),
        });
      }

      // Delete node rows
      const deleteResult = await tx.node.deleteMany({
        where: { path: { startsWith: path } },
      });

      return {
        deletedCount: deleteResult.count,
        purgedStorageKeys: storageKeys,
      };
    });
  }

  async listTrashed(ownerId: string, limit = 100): Promise<Node[]> {
    return prisma.node.findMany({
      where: {
        ownerId,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: "desc" },
      take: limit,
    });
  }

  async listStalePendingUploads(olderThan: Date): Promise<Node[]> {
    return prisma.node.findMany({
      where: {
        uploadStatus: UploadStatus.PENDING,
        createdAt: { lt: olderThan },
      },
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.node.delete({ where: { id } });
  }
}

export const nodeRepo = new NodeRepository();
