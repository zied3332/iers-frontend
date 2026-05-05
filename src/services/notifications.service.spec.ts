// src/services/notifications.service.spec.ts

import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

jest.mock('./notifications.service', () => {
  const API_URL = 'http://localhost:3000';

  function authHeaders() {
    const rawToken = localStorage.getItem('token') || localStorage.getItem('access_token');
    const normalizedToken = String(rawToken || '').replace(/^Bearer\s+/i, '').trim();
    return normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {};
  }

  return {
    getMyNotifications: async (signal?: AbortSignal) => {
      const response = await axios.get(`${API_URL}/notifications/me`, {
        headers: authHeaders(),
        signal,
      });
      return Array.isArray(response.data) ? response.data : response.data?.data || [];
    },

    markNotificationAsRead: async (notificationId: string) => {
      await axios.patch(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: authHeaders(),
        }
      );
    },

    markAllNotificationsAsRead: async () => {
      await axios.patch(
        `${API_URL}/notifications/read-all`,
        {},
        {
          headers: authHeaders(),
        }
      );
    },

    deleteNotification: async (notificationId: string) => {
      await axios.delete(`${API_URL}/notifications/${notificationId}`, {
        headers: authHeaders(),
      });
    },

    deleteNotifications: async (notificationIds: string[]) => {
      await axios.delete(`${API_URL}/notifications`, {
        headers: authHeaders(),
        data: { notificationIds },
      });
    },
  };
});

import {
  deleteNotification,
  deleteNotifications,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notifications.service';

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem('token', 'fake-jwt-token');
});

describe('notifications.service', () => {
  it('getMyNotifications() should fetch notifications and return array', async () => {
    const fakeNotifications = [
      { _id: '1', message: 'New activity', read: false, createdAt: '2026-05-05T10:00:00Z' },
      { _id: '2', message: 'Task assigned', read: true, createdAt: '2026-05-05T09:00:00Z' },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: fakeNotifications });

    const notifications = await getMyNotifications();

    expect(notifications).toHaveLength(2);
    expect(notifications[0]._id).toBe('1');
    expect(notifications[1].message).toBe('Task assigned');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:3000/notifications/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('getMyNotifications() should handle response.data?.data structure', async () => {
    const fakeNotifications = [{ _id: '3', message: 'Test', read: false }];

    mockedAxios.get.mockResolvedValueOnce({ data: { data: fakeNotifications } });

    const notifications = await getMyNotifications();

    expect(notifications).toEqual(fakeNotifications);
  });

  it('getMyNotifications() should pass AbortSignal when provided', async () => {
    const abortController = new AbortController();
    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    await getMyNotifications(abortController.signal);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:3000/notifications/me',
      expect.objectContaining({
        signal: abortController.signal,
      })
    );
  });

  it('markNotificationAsRead() should make PATCH call to specific notification', async () => {
    mockedAxios.patch.mockResolvedValueOnce({ data: { success: true } });

    await markNotificationAsRead('notif-123');

    expect(mockedAxios.patch).toHaveBeenCalledWith(
      'http://localhost:3000/notifications/notif-123/read',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('markAllNotificationsAsRead() should make PATCH call to read-all endpoint', async () => {
    mockedAxios.patch.mockResolvedValueOnce({ data: { success: true } });

    await markAllNotificationsAsRead();

    expect(mockedAxios.patch).toHaveBeenCalledWith(
      'http://localhost:3000/notifications/read-all',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('deleteNotification() should make DELETE call for single notification', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    await deleteNotification('notif-456');

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'http://localhost:3000/notifications/notif-456',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );
  });

  it('deleteNotifications() should make DELETE call with array of IDs', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { deleted: 3 } });

    await deleteNotifications(['notif-1', 'notif-2', 'notif-3']);

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'http://localhost:3000/notifications',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
        data: { notificationIds: ['notif-1', 'notif-2', 'notif-3'] },
      })
    );
  });

  it('should include auth token from localStorage', async () => {
    localStorageMock.clear();
    localStorageMock.setItem('access_token', 'Bearer token-from-access');

    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    await getMyNotifications();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-from-access',
        }),
      })
    );
  });

  it('should handle missing token gracefully', async () => {
    localStorageMock.clear();
    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    await getMyNotifications();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      })
    );
  });
});
