export type Role = "VIEWER" | "EDITOR" | "OWNER";

export const RoleHierarchy: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export type Action =
  | "view"
  | "list"
  | "download"
  | "upload"
  | "rename"
  | "edit"
  | "move"
  | "delete"
  | "share"
  | "create_link"
  | "revoke_link"
  | "approve_request"
  | "restore"
  | "purge";

export interface PermissionContext {
  isLink?: boolean;
  linkRole?: "VIEWER" | "EDITOR";
}

/**
 * The canonical DriveLite permission matrix
 */
export const PERMISSION_MATRIX: Record<Action, { minRole: Role; allowLinkView: boolean; allowLinkEdit: boolean }> = {
  view: { minRole: "VIEWER", allowLinkView: true, allowLinkEdit: true },
  list: { minRole: "VIEWER", allowLinkView: true, allowLinkEdit: true },
  download: { minRole: "VIEWER", allowLinkView: true, allowLinkEdit: true },
  upload: { minRole: "EDITOR", allowLinkView: false, allowLinkEdit: true },
  rename: { minRole: "EDITOR", allowLinkView: false, allowLinkEdit: true },
  edit: { minRole: "EDITOR", allowLinkView: false, allowLinkEdit: true },
  move: { minRole: "EDITOR", allowLinkView: false, allowLinkEdit: false },
  delete: { minRole: "EDITOR", allowLinkView: false, allowLinkEdit: false },
  share: { minRole: "OWNER", allowLinkView: false, allowLinkEdit: false },
  create_link: { minRole: "OWNER", allowLinkView: false, allowLinkEdit: false },
  revoke_link: { minRole: "OWNER", allowLinkView: false, allowLinkEdit: false },
  approve_request: { minRole: "OWNER", allowLinkView: false, allowLinkEdit: false },
  restore: { minRole: "OWNER", allowLinkView: false, allowLinkEdit: false },
  purge: { minRole: "OWNER", allowLinkView: false, allowLinkEdit: false },
};

export function isRoleSufficient(effectiveRole: Role | null, action: Action, isLink: boolean = false): boolean {
  if (!effectiveRole) return false;

  const rule = PERMISSION_MATRIX[action];
  if (!rule) return false;

  if (isLink) {
    if (effectiveRole === "VIEWER" && rule.allowLinkView) return true;
    if (effectiveRole === "EDITOR" && rule.allowLinkEdit) return true;
    return false;
  }

  return RoleHierarchy[effectiveRole] >= RoleHierarchy[rule.minRole];
}
