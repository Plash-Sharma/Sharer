import { z } from "zod";
import { userRepo } from "../repositories/user.repo";
import { hashPassword, verifyPassword } from "../security/password";
import { createSessionToken, SessionPayload } from "../security/session";
import { rateLimiter } from "../security/ratelimit";
import { auditService } from "./audit.service";
import { ConflictError, UnauthorizedError } from "../errors";

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(1).max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export class AuthService {
  async register(input: z.infer<typeof RegisterSchema>, ip?: string): Promise<{ token: string; user: SessionPayload }> {
    const data = RegisterSchema.parse(input);

    // Rate limit registration by IP: 5 per minute
    if (ip) {
      rateLimiter.check(`register:${ip}`, 5, 60);
    }

    const existing = await userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepo.create({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    const payload: SessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const token = await createSessionToken(payload);

    await auditService.log({
      actorId: user.id,
      action: "auth.register",
      ip,
      metadata: { email: user.email },
    });

    return { token, user: payload };
  }

  async login(input: z.infer<typeof LoginSchema>, ip?: string): Promise<{ token: string; user: SessionPayload }> {
    const data = LoginSchema.parse(input);

    // Rate limit login by IP + email: 5 attempts per minute (Section 1.1 F1, Phase 2)
    const rateLimitKey = `login:${ip || "unknown"}:${data.email}`;
    rateLimiter.check(rateLimitKey, 5, 60);

    const user = await userRepo.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const payload: SessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const token = await createSessionToken(payload);

    await auditService.log({
      actorId: user.id,
      action: "auth.login",
      ip,
      metadata: { email: user.email },
    });

    return { token, user: payload };
  }
}

export const authService = new AuthService();
