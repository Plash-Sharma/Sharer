import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { permissionService } from "@/server/services/permission.service";
import { handleApiError, BadRequestError } from "@/server/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;

    const grants = await permissionService.listGrants(actor, id);
    return NextResponse.json({ grants });
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

    const grant = await permissionService.grant(actor, id, body);
    return NextResponse.json({ grant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      throw new BadRequestError("Query parameter 'userId' is required");
    }

    await permissionService.revoke(actor, id, targetUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
