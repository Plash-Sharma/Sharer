import { NextRequest, NextResponse } from "next/server";
import { shareLinkService } from "@/server/services/sharelink.service";
import { nodeRepo } from "@/server/repositories/node.repo";
import { handleApiError } from "@/server/errors";
import { NodeType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const { link, node } = await shareLinkService.resolveLink(token, ip);

    let children = undefined;
    if (node.type === NodeType.FOLDER) {
      const { items } = await nodeRepo.listChildren({
        parentId: node.id,
        limit: 100,
      });
      children = items.map((child) => ({
        ...child,
        size: child.size ? child.size.toString() : null,
      }));
    }

    const response = NextResponse.json({
      link,
      node: {
        ...node,
        size: node.size ? node.size.toString() : null,
      },
      children,
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Referrer-Policy", "no-referrer");

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
