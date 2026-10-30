import { describe, it, expect } from "vitest";
import { newStorageKey } from "@/server/storage/keys";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  GoneError,
  UnauthorizedError,
  ConflictError,
  UnprocessableEntityError,
} from "@/server/errors";

describe("Phase 1 Foundation Smoke Tests", () => {
  describe("Storage Keys", () => {
    it("generates a valid UUID v4 without paths or slashes", () => {
      const key = newStorageKey();
      expect(key).toBeDefined();
      expect(key).not.toContain("/");
      expect(key).not.toContain("\\");
      // Standard UUID format check
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(key).toMatch(uuidRegex);
    });

    it("generates distinct keys across calls", () => {
      const key1 = newStorageKey();
      const key2 = newStorageKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("Error Hierarchy", () => {
    it("assigns appropriate HTTP status codes and error codes", () => {
      const unauth = new UnauthorizedError();
      expect(unauth.statusCode).toBe(401);
      expect(unauth.code).toBe("UNAUTHORIZED");

      const forbidden = new ForbiddenError();
      expect(forbidden.statusCode).toBe(403);
      expect(forbidden.code).toBe("FORBIDDEN");

      const notFound = new NotFoundError();
      expect(notFound.statusCode).toBe(404);
      expect(notFound.code).toBe("NOT_FOUND");

      const conflict = new ConflictError();
      expect(conflict.statusCode).toBe(409);
      expect(conflict.code).toBe("CONFLICT");

      const gone = new GoneError();
      expect(gone.statusCode).toBe(410);
      expect(gone.code).toBe("GONE");

      const unprocessable = new UnprocessableEntityError();
      expect(unprocessable.statusCode).toBe(422);
      expect(unprocessable.code).toBe("UNPROCESSABLE_ENTITY");

      expect(forbidden).toBeInstanceOf(AppError);
      expect(forbidden).toBeInstanceOf(Error);
    });
  });
});
