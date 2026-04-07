import type { AppNotification } from '../../types/notification';

type Props = {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
};

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} h ago`;
  if (days < 7) return `${days} d ago`;

  return date.toLocaleDateString();
}

export default function NotificationItem({ notification, onClick }: Props) {
  const sourceText = String(notification.metadata?.actorName || notification.title || "").trim();
  const sourceParts = sourceText.split(/\s+/).filter(Boolean);
  const initials = (
    (sourceParts[0]?.[0] || "N") + (sourceParts[1]?.[0] || sourceParts[0]?.[1] || "")
  ).toUpperCase();

  const hue = sourceText
    .split("")
    .reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 360, 0);

  return (
    <button
      type="button"
      className={`notification-item ${notification.isRead ? '' : 'unread'}`}
      onClick={() => onClick(notification)}
    >
      <div className="notification-avatar" style={{ background: `hsl(${hue} 80% 48%)` }}>
        {initials}
      </div>

      <div className="notification-content">
        <p className="notification-message">{notification.message || notification.title}</p>
        <span className="notification-date">{formatRelativeDate(notification.createdAt)}</span>
      </div>

      {!notification.isRead && <span className="notification-dot" />}
    </button>
  );
}