import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { uploadService } from "@/server/services/upload.service";
import { handleApiError } from "@/server/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;

    const result = await uploadService.getDownloadUrl(actor, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
