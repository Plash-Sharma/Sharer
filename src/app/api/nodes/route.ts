import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { nodeService } from "@/server/services/node.service";
import { handleApiError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    const actor = await getCurrentUser();
    const { searchParams } = req.nextUrl;

    const parentId = searchParams.get("parentId") || null;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
    const sort = (searchParams.get("sort") as "name_asc" | "name_desc" | "updated_desc" | "size_desc") || "name_asc";
    const searchQuery = searchParams.get("q") || undefined;

    const result = await nodeService.listChildren(actor, parentId, {
      cursor,
      limit,
      sort,
      searchQuery,
    });

    // Helper for bigint serialization
    const serializedItems = result.items.map((item) => ({
      ...item,
      size: item.size ? item.size.toString() : null,
    }));

    return NextResponse.json({
      ...result,
      items: serializedItems,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentUser();
    const body = await req.json();

    const folder = await nodeService.createFolder(actor, body);

    return NextResponse.json(
      {
        folder: {
          ...folder,
          size: folder.size ? folder.size.toString() : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
