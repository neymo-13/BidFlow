import { api } from "../http";
import { Notification, Page } from "../types";

export const notificationApi = {
  getMyNotifications: async (page = 0, size = 20): Promise<Page<Notification>> => {
    const res = await api.get<Page<Notification>>(
      `/api/notifications?page=${page}&size=${size}`
    );
    return res.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.put(`/api/notifications/${id}/read`);
  },
};
