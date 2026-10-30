import { NextResponse } from "next/server";
import { getSession } from "@/server/security/session";
import { userRepo } from "@/server/repositories/user.repo";
import { handleApiError, UnauthorizedError } from "@/server/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      throw new UnauthorizedError();
    }

    const user = await userRepo.findById(session.id);
    if (!user) {
      throw new UnauthorizedError();
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
