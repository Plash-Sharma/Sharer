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

    const node = await uploadService.complete(actor, nodeId);
    return NextResponse.json({
      node: {
        ...node,
        size: node.size ? node.size.toString() : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
