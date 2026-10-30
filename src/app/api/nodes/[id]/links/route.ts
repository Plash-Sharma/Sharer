import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { shareLinkService } from "@/server/services/sharelink.service";
import { handleApiError } from "@/server/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;

    const links = await shareLinkService.listLinks(actor, id);
    return NextResponse.json({ links });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();

    const link = await shareLinkService.createLink(actor, id, body);
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
