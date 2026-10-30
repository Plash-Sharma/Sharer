import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { accessRequestService } from "@/server/services/accessrequest.service";
import { handleApiError } from "@/server/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();

    const resolved = await accessRequestService.resolveRequest(actor, id, body);
    return NextResponse.json({ request: resolved });
  } catch (error) {
    return handleApiError(error);
  }
}
