import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/server/services/auth.service";
import { handleApiError } from "@/server/errors";
import { getSessionCookieName } from "@/server/security/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const { token, user } = await authService.register(body, ip);

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
