import { create } from "zustand";
import { notificationApi } from "@/lib/api";
import { Notification } from "@/lib/types";

// No unread-count endpoint yet → count unread within the latest items
const LATEST_SIZE = 20;

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  isLoaded: boolean;

  fetchLatest: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  reset: () => void;
}

const countUnread = (items: Notification[]) => items.filter((n) => !n.isRead).length;

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  isLoaded: false,

  fetchLatest: async () => {
    try {
      const page = await notificationApi.getMyNotifications(0, LATEST_SIZE);
      set({ items: page.content, unreadCount: countUnread(page.content), isLoaded: true });
    } catch {
      // Keep the last known state; the next poll will retry
    }
  },

  markRead: async (id) => {
    await notificationApi.markAsRead(id);
    set((state) => {
      const items = state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      return { items, unreadCount: countUnread(items) };
    });
  },

  reset: () => set({ items: [], unreadCount: 0, isLoaded: false }),
}));
