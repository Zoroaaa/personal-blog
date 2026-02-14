/**
 * 通知状态管理
 *
 * 使用 Zustand 管理通知状态
 *
 * @version 2.1.0
 * @author 博客系统
 * @created 2024-01-01
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Notification,
  NotificationSettings,
  UnreadCountResponse,
  NotificationFilter,
} from '../types/notifications';
import * as notificationApi from '../utils/notificationApi';

interface NotificationState {
  notifications: Notification[];
  unreadCount: UnreadCountResponse;
  hasMore: boolean;
  currentPage: number;

  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  settings: NotificationSettings | null;
  isSettingsLoading: boolean;

  filter: NotificationFilter;

  fetchNotifications: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: (type?: string) => Promise<{ markedCount: number }>;
  deleteNotification: (notificationId: number) => Promise<void>;
  setFilter: (filter: NotificationFilter) => void;

  fetchSettings: () => Promise<void>;
  updateSettings: (settings: import('../types/notifications').PartialNotificationSettings) => Promise<void>;

  clearError: () => void;
}

const defaultSettings: NotificationSettings = {
  system: {
    inApp: true,
    email: true,
    frequency: 'realtime',
  },
  interaction: {
    inApp: true,
    email: false,
    frequency: 'realtime',
    subtypes: {
      comment: true,
      like: true,
      favorite: true,
      mention: true,
      reply: true,
    },
  },
  doNotDisturb: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  digestTime: {
    daily: '09:00',
    weeklyDay: 1,
    weeklyTime: '09:00',
  },
};

const defaultUnreadCount: UnreadCountResponse = {
  total: 0,
  byType: {
    system: 0,
    interaction: 0,
  },
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: defaultUnreadCount,
      hasMore: true,
      currentPage: 1,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      settings: null,
      isSettingsLoading: false,
      filter: {
        type: 'all',
      },

      fetchNotifications: async (reset = true) => {
        const { filter } = get();
        const page = reset ? 1 : get().currentPage;

        set({
          isLoading: reset,
          isLoadingMore: !reset,
          error: null,
          ...(reset ? { notifications: [], currentPage: 1 } : {}),
        });

        try {
          const response = await notificationApi.getNotifications(page, 20, filter);

          set((state) => ({
            notifications: reset
              ? response.notifications
              : [...state.notifications, ...response.notifications],
            hasMore: response.pagination.page < response.pagination.totalPages,
            currentPage: page + 1,
            isLoading: false,
            isLoadingMore: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取通知失败',
            isLoading: false,
            isLoadingMore: false,
          });
        }
      },

      loadMore: async () => {
        const { hasMore, isLoadingMore } = get();
        if (!hasMore || isLoadingMore) return;

        await get().fetchNotifications(false);
      },

      fetchUnreadCount: async () => {
        try {
          const count = await notificationApi.getUnreadCount();
          set({ unreadCount: count });
        } catch (error) {
          console.error('获取未读数失败:', error);
        }
      },

      markAsRead: async (notificationId: number) => {
        try {
          await notificationApi.markAsRead(notificationId);

          set((state) => {
            const notification = state.notifications.find(
              (n) => n.id === notificationId
            );

            if (!notification || notification.isRead) {
              return state;
            }

            const updatedNotifications = state.notifications.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            );

            const type = notification.type;
            const updatedUnreadCount = {
              ...state.unreadCount,
              total: Math.max(0, state.unreadCount.total - 1),
              byType: {
                ...state.unreadCount.byType,
                [type]: Math.max(0, state.unreadCount.byType[type] - 1),
              },
            };

            return {
              notifications: updatedNotifications,
              unreadCount: updatedUnreadCount,
            };
          });
        } catch (error) {
          console.error('标记已读失败:', error);
          throw error;
        }
      },

      markAllAsRead: async (type?: string) => {
        try {
          const result = await notificationApi.markAllAsRead(type);

          set((state) => {
            const updatedNotifications = state.notifications.map((n) =>
              !type || n.type === type ? { ...n, isRead: true } : n
            );

            const updatedUnreadCount = type
              ? {
                  ...state.unreadCount,
                  total: state.unreadCount.total - state.unreadCount.byType[type as keyof typeof state.unreadCount.byType],
                  byType: {
                    ...state.unreadCount.byType,
                    [type]: 0,
                  },
                }
              : defaultUnreadCount;

            return {
              notifications: updatedNotifications,
              unreadCount: updatedUnreadCount,
            };
          });

          return result;
        } catch (error) {
          console.error('标记全部已读失败:', error);
          throw error;
        }
      },

      deleteNotification: async (notificationId: number) => {
        try {
          await notificationApi.deleteNotification(notificationId);

          set((state) => {
            const notification = state.notifications.find(
              (n) => n.id === notificationId
            );

            const updatedNotifications = state.notifications.filter(
              (n) => n.id !== notificationId
            );

            if (notification && !notification.isRead) {
              const type = notification.type;
              return {
                notifications: updatedNotifications,
                unreadCount: {
                  ...state.unreadCount,
                  total: Math.max(0, state.unreadCount.total - 1),
                  byType: {
                    ...state.unreadCount.byType,
                    [type]: Math.max(0, state.unreadCount.byType[type] - 1),
                  },
                },
              };
            }

            return { notifications: updatedNotifications };
          });
        } catch (error) {
          console.error('删除通知失败:', error);
          throw error;
        }
      },

      setFilter: (filter: NotificationFilter) => {
        set({ filter });
        get().fetchNotifications(true);
      },

      fetchSettings: async () => {
        set({ isSettingsLoading: true });
        try {
          const settings = await notificationApi.getNotificationSettings();
          set({ settings, isSettingsLoading: false });
        } catch (error) {
          console.error('获取通知设置失败:', error);
          set({ settings: defaultSettings, isSettingsLoading: false });
        }
      },

      updateSettings: async (newSettings: import('../types/notifications').PartialNotificationSettings) => {
        try {
          const updated = await notificationApi.updateNotificationSettings(newSettings);
          set({ settings: updated });
        } catch (error) {
          console.error('更新通知设置失败:', error);
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        settings: state.settings,
        unreadCount: state.unreadCount,
      }),
    }
  )
);
