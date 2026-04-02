import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotification } from '../../types/notification';
import NotificationItem from './NotificationItem';

type Props = {
  onClose: () => void;
};

function getNotificationsPath() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '/notifications';
    const user = JSON.parse(raw);
    const role = String(user?.role || '').toUpperCase();
    if (role === 'SUPER_MANAGER' || role === 'SUPER MANGER') return '/super-manager/notifications';
    if (role === 'HR') return '/hr/notifications';
    if (role === 'MANAGER') return '/manager/notifications';
    if (role === 'EMPLOYEE') return '/me/notifications';
    return '/notifications';
  } catch {
    return '/notifications';
  }
}

export default function NotificationDropdown({ onClose }: Props) {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    markOneAsRead,
    markEverythingAsRead,
  } = useNotifications();

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markOneAsRead(notification._id);
    }

    onClose();

    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate(getNotificationsPath());
    }
  };

  const latestNotifications = notifications.slice(0, 6);

  return (
    <div className="notification-dropdown">
      <div className="notification-dropdown-header">
        <div>
          <h3>Notifications</h3>
          <p>Recent updates and alerts</p>
        </div>

        <button
          type="button"
          className="mark-all-btn"
          onClick={markEverythingAsRead}
        >
          Mark all as read
        </button>
      </div>

      <div className="notification-dropdown-body">
        {loading ? (
          <div className="notification-empty">Loading notifications...</div>
        ) : latestNotifications.length === 0 ? (
          <div className="notification-empty">No notifications found.</div>
        ) : (
          latestNotifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onClick={handleNotificationClick}
            />
          ))
        )}
      </div>

      <div className="notification-dropdown-footer">
        <button
          type="button"
          className="view-all-btn"
          onClick={() => {
            onClose();
            navigate(getNotificationsPath());
          }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}