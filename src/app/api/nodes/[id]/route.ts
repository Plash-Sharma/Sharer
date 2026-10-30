import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { nodeService } from "@/server/services/node.service";
import { handleApiError, BadRequestError } from "@/server/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;

    const { node, effectiveRole } = await nodeService.getNode(actor, id);
    const breadcrumbs = await nodeService.getAncestors(actor, node.path);

    return NextResponse.json({
      node: {
        ...node,
        size: node.size ? node.size.toString() : null,
      },
      effectiveRole,
      breadcrumbs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();

    if ("name" in body) {
      const updated = await nodeService.rename(actor, id, body);
      return NextResponse.json({
        node: {
          ...updated,
          size: updated.size ? updated.size.toString() : null,
        },
      });
    }

    if ("newParentId" in body) {
      const moved = await nodeService.move(actor, id, body);
      return NextResponse.json({
        node: {
          ...moved,
          size: moved.size ? moved.size.toString() : null,
        },
      });
    }

    throw new BadRequestError("Expected 'name' for rename or 'newParentId' for move");
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

    const count = await nodeService.softDelete(actor, id);
    return NextResponse.json({ deletedCount: count });
  } catch (error) {
    return handleApiError(error);
  }
}
