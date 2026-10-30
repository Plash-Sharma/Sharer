import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { accessRequestService } from "@/server/services/accessrequest.service";
import { handleApiError } from "@/server/errors";

export async function GET() {
  try {
    const actor = await getCurrentUser();
    const [incoming, outgoing] = await Promise.all([
      accessRequestService.listIncoming(actor),
      accessRequestService.listOutgoing(actor),
    ]);

    return NextResponse.json({ incoming, outgoing });
  } catch (error) {
    return handleApiError(error);
  }
}
