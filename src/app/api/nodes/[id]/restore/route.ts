import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { nodeService } from "@/server/services/node.service";
import { handleApiError } from "@/server/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;

    const count = await nodeService.restore(actor, id);
    return NextResponse.json({ restoredCount: count });
  } catch (error) {
    return handleApiError(error);
  }
}
