import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { contentService } from "@/server/services/content.service";
import { handleApiError, BadRequestError } from "@/server/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;

    const { text, node } = await contentService.readText(actor, id);
    return NextResponse.json({
      text,
      node: {
        ...node,
        size: node.size ? node.size.toString() : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();

    if (typeof body.content !== "string") {
      throw new BadRequestError("Expected 'content' as a string in payload");
    }

    const updated = await contentService.saveText(
      actor,
      id,
      body.content,
      body.clientUpdatedAt
    );

    return NextResponse.json({
      node: {
        ...updated,
        size: updated.size ? updated.size.toString() : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
