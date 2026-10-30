import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { permissionService } from "@/server/services/permission.service";
import { handleApiError } from "@/server/errors";

export async function GET() {
  try {
    const actor = await getCurrentUser();
    const items = await permissionService.listSharedWithMe(actor);

    const serialized = items.map((item) => ({
      ...item,
      size: item.size ? item.size.toString() : null,
    }));

    return NextResponse.json({ items: serialized });
  } catch (error) {
    return handleApiError(error);
  }
}
