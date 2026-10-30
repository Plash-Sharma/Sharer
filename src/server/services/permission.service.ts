import { z } from "zod";
import { nodeRepo } from "../repositories/node.repo";
import { permissionRepo } from "../repositories/permission.repo";
import { userRepo } from "../repositories/user.repo";
import { assertCan } from "../permissions/guard";
import { auditService } from "./audit.service";
import { NotFoundError, BadRequestError } from "../errors";
import { Role } from "@prisma/client";

export const GrantPermissionSchema = z.object({
  targetEmail: z.string().email().toLowerCase().trim(),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export class PermissionService {
  async listGrants(actor: { id: string }, nodeId: string) {
    const node = await nodeRepo.findById(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    const actorGrants = await permissionRepo.listForNodeAndAncestors(actor.id, [node.id, ...ancestorIds]);

    assertCan({
      actor,
      action: "share",
      node,
      grants: actorGrants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const grants = await permissionRepo.listByNode(nodeId);
    return grants.map((g) => ({
      id: g.id,
      userId: g.userId,
      email: g.user.email,
      name: g.user.name,
      role: g.role,
      createdAt: g.createdAt,
    }));
  }

  async grant(
    actor: { id: string },
    nodeId: string,
    input: z.infer<typeof GrantPermissionSchema>
  ) {
    const data = GrantPermissionSchema.parse(input);
    const node = await nodeRepo.findById(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    const actorGrants = await permissionRepo.listForNodeAndAncestors(actor.id, [node.id, ...ancestorIds]);

    assertCan({
      actor,
      action: "share",
      node,
      grants: actorGrants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    const targetUser = await userRepo.findByEmail(data.targetEmail);
    if (!targetUser) {
      throw new NotFoundError(`User with email "${data.targetEmail}" was not found`);
    }

    if (targetUser.id === node.ownerId) {
      throw new BadRequestError("Cannot set explicit permissions for the owner");
    }

    const grant = await permissionRepo.upsert(
      nodeId,
      targetUser.id,
      data.role as Role,
      actor.id
    );

    await auditService.log({
      actorId: actor.id,
      action: "permission.grant",
      nodeId,
      metadata: { targetUserId: targetUser.id, targetEmail: targetUser.email, role: data.role },
    });

    return {
      id: grant.id,
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: grant.role,
    };
  }

  async revoke(actor: { id: string }, nodeId: string, targetUserId: string) {
    const node = await nodeRepo.findById(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    const ancestorIds = node.path.split("/").filter((s) => s.length > 0 && s !== node.id);
    const actorGrants = await permissionRepo.listForNodeAndAncestors(actor.id, [node.id, ...ancestorIds]);

    assertCan({
      actor,
      action: "share",
      node,
      grants: actorGrants.map((g) => ({ nodeId: g.nodeId, userId: g.userId, role: g.role })),
    });

    await permissionRepo.delete(nodeId, targetUserId);

    await auditService.log({
      actorId: actor.id,
      action: "permission.revoke",
      nodeId,
      metadata: { targetUserId },
    });
  }

  async listSharedWithMe(actor: { id: string }) {
    return permissionRepo.listTopLevelSharedNodes(actor.id);
  }
}

export const permissionService = new PermissionService();
