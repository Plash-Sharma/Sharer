import { prisma } from "../db/prisma";
import { Notification, Prisma } from "@prisma/client";

export class NotificationRepository {
  async create(data: {
    userId: string;
    type: string;
    payload: Prisma.InputJsonValue;
  }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        payload: data.payload,
      },
    });
  }

  async listUnread(userId: string, limit = 20): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const res = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }
}

export const notificationRepo = new NotificationRepository();
