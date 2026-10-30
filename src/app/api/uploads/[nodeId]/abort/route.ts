import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { uploadService } from "@/server/services/upload.service";
import { handleApiError } from "@/server/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { nodeId } = await params;

    await uploadService.abort(actor, nodeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
