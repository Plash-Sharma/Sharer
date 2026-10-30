import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { userRepo } from "@/server/repositories/user.repo";
import { handleApiError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const query = req.nextUrl.searchParams.get("q") || "";

    if (query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    const users = await userRepo.searchByEmail(query, 10);
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}
