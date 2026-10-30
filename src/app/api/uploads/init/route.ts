import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { uploadService } from "@/server/services/upload.service";
import { handleApiError } from "@/server/errors";

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentUser();
    const body = await req.json();

    const result = await uploadService.init(actor, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
