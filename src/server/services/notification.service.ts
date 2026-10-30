import { notificationRepo } from "../repositories/notification.repo";

export class NotificationService {
  async getUnread(actorId: string) {
    return notificationRepo.listUnread(actorId);
  }

  async markAsRead(actorId: string, id: string) {
    return notificationRepo.markAsRead(id, actorId);
  }

  async markAllAsRead(actorId: string) {
    return notificationRepo.markAllAsRead(actorId);
  }
}

export const notificationService = new NotificationService();
