import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppNotification } from '../types/notification';
import {
  deleteNotification,
  deleteNotifications,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications.service';

function getAuthToken() {
  return (localStorage.getItem('token') || localStorage.getItem('access_token') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markOneAsRead: (notificationId: string) => Promise<void>;
  markEverythingAsRead: () => Promise<void>;
  deleteOneNotification: (notificationId: string) => Promise<void>;
  deleteManyNotifications: (notificationIds: string[]) => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextType | null>(
  null
);

type Props = {
  children: ReactNode;
};

export function NotificationProvider({ children }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const activeFetchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeFetchControllerRef.current?.abort();
    };
  }, []);

  const refreshNotifications = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    activeFetchControllerRef.current?.abort();
    const controller = new AbortController();
    activeFetchControllerRef.current = controller;

    try {
      setLoading(true);
      const data = await getMyNotifications(controller.signal);
      if (controller.signal.aborted) return;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      if (controller.signal.aborted) return;
      const status = (error as any)?.response?.status;
      if (status !== 401) {
        console.error('Failed to fetch notifications:', error);
      }
      setNotifications([]);
    } finally {
      if (controller.signal.aborted) return;
      setLoading(false);
      if (activeFetchControllerRef.current === controller) {
        activeFetchControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const onPageShow = () => {
      void refreshNotifications();
    };

    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refreshNotifications]);

  const markOneAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === notificationId ? { ...item, isRead: true } : item
      )
    );

    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const markEverythingAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const deleteOneNotification = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.filter((item) => item._id !== notificationId));

    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const deleteManyNotifications = useCallback(async (notificationIds: string[]) => {
    const ids = Array.from(new Set(notificationIds.filter(Boolean)));
    if (!ids.length) return;

    setNotifications((prev) => prev.filter((item) => !ids.includes(item._id)));

    try {
      await deleteNotifications(ids);
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshNotifications();

    const interval = setInterval(() => {
      refreshNotifications();
    }, 20000);

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markOneAsRead,
      markEverythingAsRead,
      deleteOneNotification,
      deleteManyNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markOneAsRead,
      markEverythingAsRead,
      deleteOneNotification,
      deleteManyNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}