import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { nodeService } from "@/server/services/node.service";
import { handleApiError } from "@/server/errors";

export async function GET() {
  try {
    const actor = await getCurrentUser();
    const items = await nodeService.listTrashed(actor);

    const serialized = items.map((item) => ({
      ...item,
      size: item.size ? item.size.toString() : null,
    }));

    return NextResponse.json({ items: serialized });
  } catch (error) {
    return handleApiError(error);
  }
}
