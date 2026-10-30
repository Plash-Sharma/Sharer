import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/server/security/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(getSessionCookieName());
  return response;
}
