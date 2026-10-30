import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/security/session";
import { notificationService } from "@/server/services/notification.service";
import { handleApiError } from "@/server/errors";

export async function GET() {
  try {
    const actor = await getCurrentUser();
    const notifications = await notificationService.getUnread(actor.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getCurrentUser();
    const body = await req.json();

    if (body.all) {
      const count = await notificationService.markAllAsRead(actor.id);
      return NextResponse.json({ updatedCount: count });
    }

    if (body.id) {
      const notification = await notificationService.markAsRead(actor.id, body.id);
      return NextResponse.json({ notification });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
