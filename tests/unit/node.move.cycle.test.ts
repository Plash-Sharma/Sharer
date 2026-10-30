import { describe, it, expect } from "vitest";

describe("Folder Cycle Check Logic", () => {
  function isCycleMove(movedFolderPath: string, targetParentPath: string): boolean {
    return targetParentPath.startsWith(movedFolderPath);
  }

  it("permits moving a folder to the root", () => {
    const moved = "/f1/f2/";
    const newParent = "/";
    expect(isCycleMove(moved, newParent)).toBe(false);
  });

  it("permits moving a folder into an unrelated sibling branch", () => {
    const moved = "/f1/f2/";
    const newParent = "/f3/f4/";
    expect(isCycleMove(moved, newParent)).toBe(false);
  });

  it("detects and rejects moving a folder into its own direct child", () => {
    const moved = "/f1/f2/";
    const targetChild = "/f1/f2/f3/";
    expect(isCycleMove(moved, targetChild)).toBe(true);
  });

  it("detects and rejects moving a folder into a deep descendant", () => {
    const moved = "/f1/";
    const targetDeepChild = "/f1/f2/f3/f4/f5/";
    expect(isCycleMove(moved, targetDeepChild)).toBe(true);
  });
});
