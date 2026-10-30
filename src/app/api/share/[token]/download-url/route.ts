import { NextRequest, NextResponse } from "next/server";
import { shareLinkService } from "@/server/services/sharelink.service";
import { handleApiError } from "@/server/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = req.nextUrl;
    const fileId = searchParams.get("fileId") || undefined;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const result = await shareLinkService.getLinkDownloadUrl(token, fileId, ip);

    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Referrer-Policy", "no-referrer");

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
