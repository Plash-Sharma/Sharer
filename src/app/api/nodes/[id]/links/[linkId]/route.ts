import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { shareLinkService } from "@/server/services/sharelink.service";
import { handleApiError } from "@/server/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { linkId } = await params;

    const revoked = await shareLinkService.revokeLink(actor, linkId);
    return NextResponse.json({ link: revoked });
  } catch (error) {
    return handleApiError(error);
  }
}
