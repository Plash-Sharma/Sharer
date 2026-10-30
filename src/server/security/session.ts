import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UnauthorizedError } from "../errors";

const SESSION_COOKIE_NAME = "drivelite_session";
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "drivelite-dev-secret-min-32-characters-for-jwt"
);

export interface SessionPayload {
  id: string;
  email: string;
  name?: string | null;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("You must be logged in to perform this action");
  }
  return session;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
