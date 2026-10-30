import { describe, it, expect } from "vitest";
import { resolveEffectiveRole } from "@/server/permissions/resolve";
import { assertCan } from "@/server/permissions/guard";
import { ForbiddenError, NotFoundError } from "@/server/errors";

describe("Permission Engine (resolveEffectiveRole & assertCan)", () => {
  const rootFolder = {
    id: "root-1",
    ownerId: "user-owner",
    path: "/root-1/",
    deletedAt: null,
  };

  const childFolder = {
    id: "child-2",
    ownerId: "user-owner",
    path: "/root-1/child-2/",
    deletedAt: null,
  };

  const grandChildFile = {
    id: "file-3",
    ownerId: "user-owner",
    path: "/root-1/child-2/file-3/",
    deletedAt: null,
  };

  it("identifies node owner as OWNER for root, child and files", () => {
    expect(resolveEffectiveRole({ node: rootFolder, actorId: "user-owner" }).role).toBe("OWNER");
    expect(resolveEffectiveRole({ node: childFolder, actorId: "user-owner" }).role).toBe("OWNER");

    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      actorId: "user-owner",
    });
    expect(role).toBe("OWNER");

    const result = assertCan({
      actor: { id: "user-owner" },
      action: "delete",
      node: grandChildFile,
    });
    expect(result.effectiveRole).toBe("OWNER");
  });

  it("resolves direct grant on node", () => {
    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      actorId: "user-b",
      grants: [{ nodeId: "file-3", userId: "user-b", role: "EDITOR" }],
    });
    expect(role).toBe("EDITOR");
  });

  it("inherits grant from ancestor when no direct grant exists", () => {
    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      actorId: "user-b",
      ancestorIds: ["root-1", "child-2"],
      grants: [{ nodeId: "root-1", userId: "user-b", role: "VIEWER" }],
    });
    expect(role).toBe("VIEWER");
  });

  it("enforces nearest-ancestor override (EDITOR on root, but VIEWER on direct parent => VIEWER)", () => {
    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      actorId: "user-b",
      ancestorIds: ["root-1", "child-2"],
      grants: [
        { nodeId: "root-1", userId: "user-b", role: "EDITOR" },
        { nodeId: "child-2", userId: "user-b", role: "VIEWER" }, // nearer ancestor overrides root
      ],
    });
    expect(role).toBe("VIEWER");
  });

  it("returns null when user has no relation to node", () => {
    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      actorId: "stranger",
      ancestorIds: ["root-1", "child-2"],
      grants: [],
    });
    expect(role).toBeNull();

    expect(() =>
      assertCan({
        actor: { id: "stranger" },
        action: "view",
        node: grandChildFile,
      })
    ).toThrow(ForbiddenError);
  });

  it("blocks actions on trashed node with NotFoundError (except restore/purge)", () => {
    const trashedNode = { ...grandChildFile, deletedAt: new Date() };

    expect(() =>
      assertCan({
        actor: { id: "user-owner" },
        action: "view",
        node: trashedNode,
      })
    ).toThrow(NotFoundError);

    // restore is allowed for owner
    const restoreResult = assertCan({
      actor: { id: "user-owner" },
      action: "restore",
      node: trashedNode,
    });
    expect(restoreResult.effectiveRole).toBe("OWNER");
  });

  it("resolves active share link on ancestor", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const { role, isLink } = resolveEffectiveRole({
      node: grandChildFile,
      ancestorIds: ["root-1", "child-2"],
      link: {
        nodeId: "child-2",
        role: "VIEWER",
        expiresAt: new Date("2026-01-01T13:00:00Z"),
        revokedAt: null,
      },
      now,
    });
    expect(role).toBe("VIEWER");
    expect(isLink).toBe(true);
  });

  it("rejects expired share links", () => {
    const now = new Date("2026-01-01T14:00:00Z");
    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      link: {
        nodeId: "file-3",
        role: "VIEWER",
        expiresAt: new Date("2026-01-01T13:00:00Z"), // expired 1h ago
        revokedAt: null,
      },
      now,
    });
    expect(role).toBeNull();
  });

  it("rejects revoked share links", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const { role } = resolveEffectiveRole({
      node: grandChildFile,
      link: {
        nodeId: "file-3",
        role: "EDITOR",
        expiresAt: new Date("2026-01-01T13:00:00Z"),
        revokedAt: new Date("2026-01-01T11:00:00Z"), // revoked
      },
      now,
    });
    expect(role).toBeNull();
  });
});
