import { ForbiddenError, NotFoundError } from "../errors";
import { Action, isRoleSufficient, Role } from "./roles";
import { resolveEffectiveRole, NodeMeta, Grant, ShareLinkMeta, extractAncestorIds } from "./resolve";

export interface Actor {
  id: string;
  email?: string;
}

export interface AssertCanOptions {
  actor?: Actor | null;
  action: Action;
  node: NodeMeta | null | undefined;
  ancestorIds?: string[];
  grants?: Grant[];
  link?: ShareLinkMeta | null;
  now?: Date;
}

/**
 * Enforces server-side authorization for node actions.
 * Throws NotFoundError or ForbiddenError based on permission evaluation.
 */
export function assertCan(options: AssertCanOptions): { effectiveRole: Role; isLink: boolean } {
  const { actor, action, node, ancestorIds, grants, link, now } = options;

  if (!node) {
    throw new NotFoundError("Node not found");
  }

  // Soft-deleted (trash) handling: only restore/purge are valid on trashed nodes
  if (node.deletedAt != null && action !== "restore" && action !== "purge") {
    throw new NotFoundError("Node not found or has been moved to trash");
  }

  const { role, isLink } = resolveEffectiveRole({
    node,
    actorId: actor?.id ?? null,
    ancestorIds: ancestorIds ?? extractAncestorIds(node.path, node.id),
    grants,
    link,
    now,
  });

  const allowed = isRoleSufficient(role, action, isLink);

  if (!allowed) {
    if (!role) {
      throw new ForbiddenError("You do not have access to this resource.", {
        nodeId: node.id,
        action,
        canRequestAccess: true,
      });
    }

    throw new ForbiddenError(`Insufficient permissions to perform '${action}' on this resource.`, {
      nodeId: node.id,
      action,
      currentRole: role,
    });
  }

  return { effectiveRole: role!, isLink };
}
