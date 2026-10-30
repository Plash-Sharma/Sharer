import { Role, RoleHierarchy } from "./roles";

export interface NodeMeta {
  id: string;
  ownerId: string;
  path: string;
  deletedAt?: Date | null;
}

export interface Grant {
  nodeId: string;
  userId: string;
  role: "VIEWER" | "EDITOR";
}

export interface ShareLinkMeta {
  nodeId: string;
  role: "VIEWER" | "EDITOR";
  expiresAt: Date;
  revokedAt?: Date | null;
}

export function extractAncestorIds(path: string, currentNodeId?: string): string[] {
  // path is e.g. "/id1/id2/id3/"
  const segments = path.split("/").filter((s) => s.length > 0);
  if (currentNodeId && segments[segments.length - 1] === currentNodeId) {
    segments.pop();
  }
  return segments;
}

/**
 * Pure function to resolve effective role.
 * Follows Section 8: Nearest ancestor override, link resolution, owner priority.
 */
export function resolveEffectiveRole(params: {
  node: NodeMeta;
  actorId?: string | null;
  ancestorIds?: string[];
  grants?: Grant[];
  link?: ShareLinkMeta | null;
  now?: Date;
}): { role: Role | null; isLink: boolean } {
  const { node, actorId, ancestorIds = extractAncestorIds(node.path, node.id), grants = [], link, now = new Date() } = params;

  // 1. Owner check
  if (actorId && actorId === node.ownerId) {
    return { role: "OWNER", isLink: false };
  }

  // 2. Direct & Inherited grants
  let directOrInheritedRole: "VIEWER" | "EDITOR" | null = null;
  if (actorId && grants.length > 0) {
    const userGrants = grants.filter((g) => g.userId === actorId);

    // Direct grant on node itself takes top priority
    const directGrant = userGrants.find((g) => g.nodeId === node.id);
    if (directGrant) {
      directOrInheritedRole = directGrant.role;
    } else {
      // Look for grant on the nearest ancestor (working backwards from closest parent to root)
      for (let i = ancestorIds.length - 1; i >= 0; i--) {
        const ancId = ancestorIds[i];
        const ancGrant = userGrants.find((g) => g.nodeId === ancId);
        if (ancGrant) {
          directOrInheritedRole = ancGrant.role;
          break; // Nearest ancestor wins!
        }
      }
    }
  }

  // 3. Link resolution
  let linkRole: "VIEWER" | "EDITOR" | null = null;
  if (link) {
    const isRevoked = link.revokedAt != null;
    const isExpired = link.expiresAt.getTime() <= now.getTime();
    const isRelevant = link.nodeId === node.id || ancestorIds.includes(link.nodeId);

    if (!isRevoked && !isExpired && isRelevant) {
      linkRole = link.role;
    }
  }

  // 4. Combine roles: effective = max(grantRole, linkRole)
  if (!directOrInheritedRole && !linkRole) {
    return { role: null, isLink: false };
  }

  if (directOrInheritedRole && !linkRole) {
    return { role: directOrInheritedRole, isLink: false };
  }

  if (!directOrInheritedRole && linkRole) {
    return { role: linkRole, isLink: true };
  }

  // Both exist: pick the higher role
  const grantWeight = directOrInheritedRole ? RoleHierarchy[directOrInheritedRole] : 0;
  const linkWeight = linkRole ? RoleHierarchy[linkRole] : 0;

  if (linkWeight > grantWeight) {
    return { role: linkRole!, isLink: true };
  }

  return { role: directOrInheritedRole!, isLink: false };
}
