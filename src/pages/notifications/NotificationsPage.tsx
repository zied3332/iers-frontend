import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiMoreHorizontal } from 'react-icons/fi';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotification, NotificationChange } from '../../types/notification';
import { getActivityById, type ActivityRecord } from '../../services/activities.service';
import { getAllDepartments } from '../../services/departments.service';

type FilterType = 'ALL' | 'UNREAD' | 'READ';
type AccountApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNKNOWN';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function normalizeApprovalDecision(value: unknown): AccountApprovalDecision {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return 'UNKNOWN';
}

function formatApprovalDecision(value: AccountApprovalDecision) {
  if (value === 'APPROVED') return 'Approved';
  if (value === 'REJECTED') return 'Rejected';
  if (value === 'PENDING') return 'Pending';
  return 'Unknown';
}

function getRequestedUserId(notification: AppNotification | null) {
  if (!notification || notification.type !== 'ACCOUNT_APPROVAL_REQUEST') return '';
  const metadata = notification.metadata || {};
  return typeof metadata.requestedUserId === 'string' ? metadata.requestedUserId : '';
}

function normalizeSideView(value: unknown): 'unread' | 'read' | null {
  const side = String(value || '').trim().toLowerCase();
  if (side === 'unread' || side === 'read') return side;
  return null;
}

function getNotificationsBasePath(pathname: string) {
  const roleBase = pathname.match(/^\/(hr|super-manager|manager|me)\//i)?.[1];
  if (roleBase) return `/${roleBase}/notifications`;
  return '/notifications';
}

function getNotificationsRoleFromPath(pathname: string) {
  const roleBase = pathname.match(/^\/(hr|super-manager|manager|me)\//i)?.[1]?.toLowerCase();
  if (roleBase === 'hr' || roleBase === 'super-manager' || roleBase === 'manager' || roleBase === 'me') {
    return roleBase;
  }
  return 'unknown';
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const seconds = Math.round(diffMs / 1000);
  const minutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  if (Math.abs(days) < 7) return rtf.format(days, 'day');

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesFilter(item: AppNotification, filter: FilterType) {
  if (filter === 'UNREAD') return !item.isRead;
  if (filter === 'READ') return item.isRead;
  return true;
}

function getTypeBadgeClass(type: string) {
  switch (type) {
    case 'REQUEST_CREATED':
      return 'badge badge-medium';
    case 'REQUEST_APPROVED':
      return 'badge badge-expert';
    case 'REQUEST_REJECTED':
      return 'badge badge-low';
    case 'SKILL_SUBMITTED':
      return 'badge badge-medium';
    case 'SKILL_APPROVED':
      return 'badge badge-expert';
    case 'SKILL_REJECTED':
      return 'badge badge-low';
    case 'ACTIVITY_ASSIGNED':
      return 'badge badge-high';
    case 'ACCOUNT_APPROVAL_REQUEST':
      return 'badge badge-high';
    case 'GENERAL':
      return 'badge badge-neutral';
    default:
      return 'badge badge-neutral';
  }
}

type NotificationLocationState = {
  notificationId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isHiddenField(field: string) {
  const normalized = field.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'id' || normalized === '_id') return true;
  if (normalized.endsWith('_id') || normalized.endsWith('id')) return true;
  if (normalized.includes('userid') || normalized.includes('employeeid') || normalized.includes('activityid')) return true;
  return false;
}

function toLabel(field: string) {
  const map: Record<string, string> = {
    jobTitle: 'Job title',
    experienceYears: 'Years of experience',
    seniorityLevel: 'Seniority level',
    name: 'Name',
    email: 'Email',
    telephone: 'Phone number',
    matricule: 'Matricule',
    status: 'Status',
    role: 'Role',
    department: 'Department',
    departmentName: 'Department',
    date_embauche: 'Hire date',
    avatarUrl: 'Avatar',
    accountStatus: 'Account status',
    title: 'Activity title',
    description: 'Description',
    type: 'Type',
    location: 'Location',
    startDate: 'Start date',
    endDate: 'End date',
    duration: 'Duration',
    seats: 'Available seats',
    statusText: 'Status',
    context: 'Context',
    priority_level: 'Priority level',
    requestedUserName: 'Employee',
    requestedUserEmail: 'Email',
    requestedUserMatricule: 'Matricule',
  };

  if (map[field]) return map[field];
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => formatDetailValue(item)).join(', ');
  if (isRecord(value)) return JSON.stringify(value, null, 2);
  return String(value);
}

function isMongoIdLike(value: unknown) {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value.trim());
}

function formatSnapshotEntries(snapshot?: Record<string, unknown> | null) {
  if (!snapshot) return [];
  return Object.entries(snapshot).filter(([key]) => !isHiddenField(key));
}

function getEventDetails(metadata: Record<string, unknown>) {
  const entityType = String(metadata.entityType || '');

  if (entityType === 'EMPLOYEE_ASSIGNED_TO_DEPARTMENT') {
    return [
      {
        label: 'Employee',
        value: formatDetailValue(metadata.employeeName),
      },
      {
        label: 'Department',
        value: formatDetailValue(metadata.departmentName),
      },
    ].filter((item) => item.value !== 'Not set');
  }

  if (entityType === 'SKILL_ASSIGNED') {
    return [
      {
        label: 'Manager',
        value: formatDetailValue(metadata.actorName),
      },
      {
        label: 'Skill',
        value: formatDetailValue(metadata.skillName),
      },
      {
        label: 'Level',
        value: formatDetailValue(metadata.level),
      },
    ].filter((item) => item.value !== 'Not set');
  }

  return [];
}

function NotificationDetailModal({
  notification,
  onClose,
  onOpenLinkedPage,
  onApproveRequest,
  onRejectRequest,
  accountRequestStatus = 'UNKNOWN',
  accountRequestStatusLoading = false,
  actionLoading = false,
}: {
  notification: AppNotification;
  onClose: () => void;
  onOpenLinkedPage?: () => void;
  onApproveRequest?: (userId: string) => void | Promise<void>;
  onRejectRequest?: (userId: string) => void | Promise<void>;
  accountRequestStatus?: AccountApprovalDecision;
  accountRequestStatusLoading?: boolean;
  actionLoading?: boolean;
}) {
  const metadata = notification.metadata || {};
  const allChanges = Array.isArray(metadata.changes) ? (metadata.changes as NotificationChange[]) : [];
  const changes = allChanges.filter((change) => !isHiddenField(change.field));
  const activitySnapshot = isRecord(metadata.activitySnapshot) ? metadata.activitySnapshot : null;
  const activityId = typeof metadata.activityId === 'string' ? metadata.activityId : '';

  const isAccountApprovalRequest = notification.type === 'ACCOUNT_APPROVAL_REQUEST';
  const requestedUserId =
    typeof metadata.requestedUserId === 'string' ? metadata.requestedUserId : '';
  const metadataApprovalStatus = normalizeApprovalDecision(metadata.status);
  const resolvedApprovalStatus = accountRequestStatus === 'UNKNOWN'
    ? metadataApprovalStatus
    : accountRequestStatus;
  const isFinalAccountDecision = resolvedApprovalStatus === 'APPROVED' || resolvedApprovalStatus === 'REJECTED';
  const canTakeAccountDecision = isAccountApprovalRequest && requestedUserId && !isFinalAccountDecision;

  const [activityDetails, setActivityDetails] = useState<ActivityRecord | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [departmentsById, setDepartmentsById] = useState<Record<string, string>>({});

  const needsDepartmentResolution = useMemo(() => {
    return changes.some((change) => {
      const field = String(change.field || '').toLowerCase();
      if (field !== 'department' && field !== 'departmentname') return false;
      return isMongoIdLike(change.before) || isMongoIdLike(change.after);
    });
  }, [changes]);

  useEffect(() => {
    if (!needsDepartmentResolution) {
      setDepartmentsById({});
      return;
    }

    let active = true;
    getAllDepartments()
      .then((rows) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          if (!row?._id) continue;
          map[String(row._id)] = String(row.name || row.code || 'Department');
        }
        setDepartmentsById(map);
      })
      .catch(() => {
        if (!active) return;
        setDepartmentsById({});
      });

    return () => {
      active = false;
    };
  }, [needsDepartmentResolution]);

  useEffect(() => {
    if (activitySnapshot || !activityId) {
      setActivityDetails(null);
      return;
    }

    let active = true;
    setActivityLoading(true);
    getActivityById(activityId)
      .then((activity) => {
        if (!active) return;
        setActivityDetails(activity);
      })
      .catch(() => {
        if (!active) return;
        setActivityDetails(null);
      })
      .finally(() => {
        if (!active) return;
        setActivityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activityId, activitySnapshot]);

  const hasProfileDiff = changes.length > 0;
  const hasActivityDetails = Boolean(activitySnapshot || activityDetails);
  const eventDetails = useMemo(() => getEventDetails(metadata), [metadata]);

  const accountApprovalDetails = useMemo(() => {
    if (!isAccountApprovalRequest) return [];
    return [
      {
        label: 'Employee',
        value: formatDetailValue(metadata.requestedUserName),
      },
      {
        label: 'Email',
        value: formatDetailValue(metadata.requestedUserEmail),
      },
      {
        label: 'Matricule',
        value: formatDetailValue(metadata.requestedUserMatricule),
      },
    ].filter((item) => item.value !== 'Not set');
  }, [isAccountApprovalRequest, metadata]);

  const formatChangeValue = useCallback((field: string, value: unknown) => {
    const normalizedField = String(field || '').toLowerCase();
    if ((normalizedField === 'department' || normalizedField === 'departmentname') && isMongoIdLike(value)) {
      const key = String(value).trim();
      if (departmentsById[key]) return departmentsById[key];
      return 'Department updated';
    }
    return formatDetailValue(value);
  }, [departmentsById]);

  const activityData = useMemo(() => {
    if (activitySnapshot) {
      return activitySnapshot;
    }
    if (!activityDetails) return null;

    return {
      title: activityDetails.title,
      description: activityDetails.description,
      type: activityDetails.type,
      location: activityDetails.location,
      startDate: activityDetails.startDate,
      endDate: activityDetails.endDate,
      duration: activityDetails.duration,
      seats: activityDetails.availableSlots,
      status: activityDetails.status,
      context: activityDetails.priorityContext,
      priority_level: activityDetails.targetLevel,
    } as Record<string, unknown>;
  }, [activityDetails, activitySnapshot]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-card notification-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{notification.title}</h2>
            <p>{notification.message}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close notification details">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="notifications-detail-summary">
            <div className="notifications-detail-summary-item">
              <span className="notifications-detail-label">Type</span>
              <strong>{notification.type.replaceAll('_', ' ')}</strong>
            </div>
            <div className="notifications-detail-summary-item">
              <span className="notifications-detail-label">Status</span>
              <strong>{notification.isRead ? 'Read' : 'Unread'}</strong>
            </div>
            <div className="notifications-detail-summary-item">
              <span className="notifications-detail-label">Received</span>
              <strong>{new Date(notification.createdAt).toLocaleString()}</strong>
            </div>
            {isAccountApprovalRequest ? (
              <div className="notifications-detail-summary-item">
                <span className="notifications-detail-label">Request decision</span>
                <strong>
                  {accountRequestStatusLoading
                    ? 'Checking...'
                    : formatApprovalDecision(resolvedApprovalStatus)}
                </strong>
              </div>
            ) : null}
            {metadata.actorName ? (
              <div className="notifications-detail-summary-item">
                <span className="notifications-detail-label">Updated by</span>
                <strong>
                  {metadata.actorName}
                  {metadata.updatedByRole || metadata.actorRole
                    ? ` (${String(metadata.updatedByRole || metadata.actorRole).replaceAll('_', ' ')})`
                    : ''}
                </strong>
              </div>
            ) : null}
          </div>

          {isAccountApprovalRequest && accountApprovalDetails.length ? (
            <div className="notifications-detail-card">
              <h4>Account Request Details</h4>
              <div className="notifications-detail-fields">
                {accountApprovalDetails.map((detail) => (
                  <div key={detail.label} className="notifications-detail-field">
                    <span className="notifications-detail-field-label">{detail.label}</span>
                    <span className="notifications-detail-field-value">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasProfileDiff ? (
            <div className="notifications-detail-card notifications-detail-changes">
              <h4>What changed</h4>
              <div className="notifications-detail-change-list">
                {changes.map((change) => (
                  <div key={change.field} className="notifications-detail-change-item">
                    <div className="notifications-detail-change-field">{toLabel(change.field)}</div>
                    <div className="notifications-detail-change-values">
                      <div>
                        <span className="notifications-detail-label">Before</span>
                        <div className="notifications-detail-field-value">{formatChangeValue(change.field, change.before)}</div>
                      </div>
                      <div>
                        <span className="notifications-detail-label">After</span>
                        <div className="notifications-detail-field-value">{formatChangeValue(change.field, change.after)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!hasProfileDiff && eventDetails.length ? (
            <div className="notifications-detail-card">
              <h4>Details</h4>
              <div className="notifications-detail-fields">
                {eventDetails.map((detail) => (
                  <div key={detail.label} className="notifications-detail-field">
                    <span className="notifications-detail-field-label">{detail.label}</span>
                    <span className="notifications-detail-field-value">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasActivityDetails ? (
            <div className="notifications-detail-card">
              <h4>Activity Details</h4>
              <div className="notifications-detail-fields">
                {formatSnapshotEntries(activityData).map(([key, value]) => (
                  <div key={`activity-${key}`} className="notifications-detail-field">
                    <span className="notifications-detail-field-label">{toLabel(key)}</span>
                    <span className="notifications-detail-field-value">{formatDetailValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activityLoading ? (
            <div className="notifications-detail-card">
              <p className="muted">Loading activity details...</p>
            </div>
          ) : null}

          {!hasProfileDiff && !hasActivityDetails && !activityLoading && eventDetails.length === 0 && !accountApprovalDetails.length ? (
            <div className="notifications-detail-card notifications-detail-empty">
              <p className="muted">No extra details to display for this notification.</p>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          {canTakeAccountDecision ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onRejectRequest?.(requestedUserId)}
                disabled={actionLoading}
              >
                Reject
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onApproveRequest?.(requestedUserId)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            </>
          ) : null}

          <button type="button" className="btn btn-primary" onClick={onClose} disabled={actionLoading}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { side: routeSide } = useParams<{ side?: string }>();
  const {
    notifications,
    loading,
    markOneAsRead,
    markEverythingAsRead,
    deleteOneNotification,
    deleteManyNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [departmentNamesById, setDepartmentNamesById] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [accountRequestStatusByUserId, setAccountRequestStatusByUserId] = useState<Record<string, AccountApprovalDecision>>({});
  const [accountRequestStatusLoading, setAccountRequestStatusLoading] = useState(false);
  const openedFromStateRef = useRef<string | null>(null);

  const notificationsBasePath = useMemo(() => getNotificationsBasePath(location.pathname), [location.pathname]);
  const notificationsRole = useMemo(() => getNotificationsRoleFromPath(location.pathname), [location.pathname]);
  const canFilterByDepartment = notificationsRole === 'hr' || notificationsRole === 'super-manager';
  const isStatusRoute = useMemo(() => Boolean(normalizeSideView(routeSide)), [routeSide]);

  const activeSideView = useMemo(() => {
    const fromRoute = normalizeSideView(routeSide);
    if (fromRoute) return fromRoute;
    const params = new URLSearchParams(location.search || '');
    return normalizeSideView(params.get('side'));
  }, [location.search, routeSide]);

  useEffect(() => {
    let active = true;
    getAllDepartments()
      .then((rows) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          if (!row?._id) continue;
          map[String(row._id)] = String(row.name || row.code || 'Department');
        }
        setDepartmentNamesById(map);
      })
      .catch(() => {
        if (!active) return;
        setDepartmentNamesById({});
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!canFilterByDepartment) {
      setDepartmentFilter('ALL');
    }
  }, [canFilterByDepartment]);

  const {
    unreadCount,
    readCount,
    todayCount,
    filteredNotifications,
    unreadNotifications,
    readNotifications,
    roleOptions,
    departmentOptions,
  } = useMemo(() => {
    const query = normalizeText(debouncedSearch);
    const todayKey = new Date().toDateString();
    const roleSet = new Set<string>();
    const departmentSet = new Set<string>();

    const normalizeRole = (value: unknown) => String(value || '')
      .trim()
      .replaceAll('-', '_')
      .replaceAll(' ', '_')
      .toUpperCase();

    const extractRole = (item: AppNotification) => {
      const metadata = item.metadata || {};
      const direct = normalizeRole(
        metadata.updatedByRole || metadata.actorRole || metadata.role || metadata.requestedUserRole
      );
      if (direct) return direct;

      const changes = Array.isArray(metadata.changes) ? metadata.changes as NotificationChange[] : [];
      const roleChange = changes.find((change) => String(change.field || '').toLowerCase() === 'role');
      const fromChange = normalizeRole(roleChange?.after ?? roleChange?.before ?? '');
      if (fromChange) return fromChange;

      const messageRole = /\b(super[_\s-]?manager|manager|employee|hr)\b/i.exec(`${item.title} ${item.message}`)?.[1] || '';
      const fromText = normalizeRole(messageRole);
      return fromText || 'UNKNOWN';
    };

    const extractDepartment = (item: AppNotification) => {
      const metadata = item.metadata || {};
      const resolveDepartmentValue = (value: unknown) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (departmentNamesById[raw]) return departmentNamesById[raw];
        if (/^[a-f0-9]{24}$/i.test(raw)) return '';
        return raw;
      };

      const direct = resolveDepartmentValue(
        metadata.departmentName ||
        metadata.department ||
        metadata.departmentId ||
        metadata.requestedUserDepartment ||
        metadata.requestedUserDepartmentId ||
        metadata.employeeDepartment ||
        metadata.employeeDepartmentId
      );
      if (direct) return direct;

      const changes = Array.isArray(metadata.changes) ? metadata.changes as NotificationChange[] : [];
      const deptChange = changes.find((change) => {
        const field = String(change.field || '').toLowerCase();
        return field === 'department' || field === 'departmentname';
      });
      const fromChange = resolveDepartmentValue(deptChange?.after ?? deptChange?.before ?? '');
      if (fromChange) return fromChange;

      return 'Unknown Department';
    };

    let unread = 0;
    let read = 0;
    let today = 0;
    const filtered: AppNotification[] = [];

    for (const item of notifications) {
      const role = extractRole(item);
      const department = extractDepartment(item);
      roleSet.add(role);
      departmentSet.add(department);

      if (item.isRead) read += 1;
      else unread += 1;

      const created = new Date(item.createdAt);
      if (!Number.isNaN(created.getTime()) && created.toDateString() === todayKey) {
        today += 1;
      }

      if (!matchesFilter(item, filter)) continue;
      if (roleFilter !== 'ALL' && role !== roleFilter) continue;
      if (canFilterByDepartment && departmentFilter !== 'ALL' && department !== departmentFilter) continue;
      if (query) {
        const haystack = normalizeText(`${item.title} ${item.message} ${item.type} ${role} ${department}`);
        if (!haystack.includes(query)) continue;
      }

      filtered.push(item);
    }

    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadTop: AppNotification[] = [];
    const readTop: AppNotification[] = [];
    for (const item of filtered) {
      if (!item.isRead) unreadTop.push(item);
      else readTop.push(item);
    }

    return {
      unreadCount: unread,
      readCount: read,
      todayCount: today,
      filteredNotifications: filtered,
      unreadNotifications: unreadTop,
      readNotifications: readTop,
      roleOptions: Array.from(roleSet).sort((a, b) => a.localeCompare(b)),
      departmentOptions: Array.from(departmentSet).sort((a, b) => a.localeCompare(b)),
    };
  }, [notifications, filter, debouncedSearch, roleFilter, departmentFilter, departmentNamesById, canFilterByDepartment]);

  const handleClick = useCallback(
    async (notification: AppNotification) => {
      if (!notification.isRead) {
        void markOneAsRead(notification._id);
      }

      const link = notification.link?.trim();
      if (link && link.startsWith('/')) {
        navigate(link);
        return;
      }

      setSelectedNotification(notification);
    },
    [markOneAsRead, navigate]
  );

  const toggleSelected = useCallback((notificationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) next.delete(notificationId);
      else next.add(notificationId);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    const confirmed = window.confirm(`Delete ${ids.length} selected notification(s)?`);
    if (!confirmed) return;

    await deleteManyNotifications(ids);
    setSelectedIds(new Set());
  }, [deleteManyNotifications, selectedIds]);

  const deleteSingle = useCallback(async (notificationId: string) => {
    const confirmed = window.confirm('Delete this notification?');
    if (!confirmed) return;

    await deleteOneNotification(notificationId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(notificationId);
      return next;
    });
  }, [deleteOneNotification]);

  const unreadPreview = useMemo(() => unreadNotifications.slice(0, 4), [unreadNotifications]);
  const readPreview = useMemo(() => readNotifications.slice(0, 4), [readNotifications]);

  const openSideView = useCallback((side: 'unread' | 'read') => {
    navigate(`${notificationsBasePath}/${side}`);
  }, [navigate, notificationsBasePath]);

  const clearSideView = useCallback(() => {
    navigate(notificationsBasePath);
  }, [navigate, notificationsBasePath]);

  const feedNotifications = useMemo(() => {
    if (activeSideView === 'unread') return unreadNotifications;
    if (activeSideView === 'read') return readNotifications;
    return filteredNotifications;
  }, [activeSideView, unreadNotifications, readNotifications, filteredNotifications]);

  const selectedInFeedCount = useMemo(() => {
    let count = 0;
    for (const item of feedNotifications) {
      if (selectedIds.has(item._id)) count += 1;
    }
    return count;
  }, [feedNotifications, selectedIds]);

  const allFeedSelected = feedNotifications.length > 0 && selectedInFeedCount === feedNotifications.length;

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(feedNotifications.map((item) => item._id)));
  }, [feedNotifications]);

  const clearVisibleSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of feedNotifications) {
        next.delete(item._id);
      }
      return next;
    });
  }, [feedNotifications]);

  const markSelectedAsRead = useCallback(async () => {
    const ids = feedNotifications
      .filter((item) => selectedIds.has(item._id) && !item.isRead)
      .map((item) => item._id);
    if (!ids.length) return;

    await Promise.all(ids.map((id) => markOneAsRead(id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, [feedNotifications, selectedIds, markOneAsRead]);

  // Only open details modal if user explicitly selects a notification
  // Remove auto-opening based on router state


  const renderNotificationCard = useCallback((notification: AppNotification) => (
    <div
      key={notification._id}
      className={`notifications-page-item ${notification.isRead ? '' : 'unread'}`}
      role="button"
      tabIndex={0}
      onClick={() => handleClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(notification);
        }
      }}
      aria-label={`Notification: ${notification.title}. ${notification.isRead ? 'Read' : 'Unread'}`}
    >
      <div className="notifications-page-item-top">
        <div>
          <div className="notifications-page-headline-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={selectedIds.has(notification._id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelected(notification._id);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select notification ${notification.title}`}
              />
              <h3>{notification.title}</h3>
            </div>
            <span className={getTypeBadgeClass(notification.type)}>
              {notification.type.replaceAll('_', ' ')}
            </span>
          </div>

          <p>{notification.message}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!notification.isRead && <span className="notification-dot" aria-hidden="true" />}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={(e) => {
              e.stopPropagation();
              void deleteSingle(notification._id);
            }}
            aria-label={`Delete notification ${notification.title}`}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="notifications-page-meta">
        <span>{formatRelativeDate(notification.createdAt)}</span>
        <span>{formatDate(notification.createdAt)}</span>
      </div>
    </div>
  ), [handleClick, selectedIds, toggleSelected, deleteSingle]);

  const closeDetailModal = useCallback(() => {
    openedFromStateRef.current = null;
    setSelectedNotification(null);
    // Clear router state to prevent modal from reopening
    navigate(location.pathname, { replace: true, state: null });
  }, [navigate, location.pathname]);

  const openLinkedPage = useCallback(() => {
    if (!selectedNotification?.link) return;
    navigate(selectedNotification.link);
  }, [navigate, selectedNotification]);

  useEffect(() => {
    const requestedUserId = getRequestedUserId(selectedNotification);
    if (!requestedUserId) {
      setAccountRequestStatusLoading(false);
      return;
    }

    let active = true;
    setAccountRequestStatusLoading(true);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    fetch(`${API_BASE}/users/${requestedUserId}`, { headers })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json().catch(() => null);
      })
      .then((user) => {
        if (!active) return;
        const status = normalizeApprovalDecision(user?.approvalStatus);
        setAccountRequestStatusByUserId((prev) => ({
          ...prev,
          [requestedUserId]: status,
        }));
      })
      .catch(() => {
        if (!active) return;
        setAccountRequestStatusByUserId((prev) => ({
          ...prev,
          [requestedUserId]: normalizeApprovalDecision(selectedNotification?.metadata?.status),
        }));
      })
      .finally(() => {
        if (!active) return;
        setAccountRequestStatusLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedNotification]);

  const handleApproveRequest = useCallback(async (userId: string) => {
    const confirmed = window.confirm('Approve this account request?');
    if (!confirmed) return;

    try {
      setRequestActionLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const res = await fetch(`${API_BASE}/users/${userId}/approve`, {
        method: 'PATCH',
        headers,
      });
      if (!res.ok) {
        throw new Error('Failed to approve account request.');
      }

      setAccountRequestStatusByUserId((prev) => ({ ...prev, [userId]: 'APPROVED' }));
      window.alert('Account request approved.');
      closeDetailModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve account request.';
      window.alert(message);
    } finally {
      setRequestActionLoading(false);
    }
  }, [closeDetailModal]);

  const handleRejectRequest = useCallback(async (userId: string) => {
    const confirmed = window.confirm('Reject this account request?');
    if (!confirmed) return;

    try {
      setRequestActionLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const res = await fetch(`${API_BASE}/users/${userId}/reject`, {
        method: 'PATCH',
        headers,
      });
      if (!res.ok) {
        throw new Error('Failed to reject account request.');
      }

      setAccountRequestStatusByUserId((prev) => ({ ...prev, [userId]: 'REJECTED' }));
      window.alert('Account request rejected.');
      closeDetailModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject account request.';
      window.alert(message);
    } finally {
      setRequestActionLoading(false);
    }
  }, [closeDetailModal]);

  return (
    <div className="page notifications-page-shell">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 12 }}>
          <div>
            <div className="header-title" style={{ fontSize: 34 }}>
              {activeSideView === 'unread'
                ? 'Unread Notifications Page'
                : activeSideView === 'read'
                  ? 'Read Notifications Page'
                  : 'Notifications Center'}
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 18 }}>
              {activeSideView
                ? 'Dedicated page for this notification status.'
                : 'Stay updated with requests, approvals, skill changes, and activity alerts.'}
            </div>
            <div className="sr-only" aria-live="polite">
              You have {unreadCount} unread notifications.
            </div>
          </div>

        </div>

        <div className="kpi-grid">
          <div className="card header-card">
            <div className="section-title">Total Notifications</div>
            <div className="score-value">{notifications.length}</div>
            <div className="score-sub">All alerts and updates</div>
          </div>

          <div className="card header-card">
            <div className="section-title">Unread</div>
            <div className="score-value">{unreadCount}</div>
            <div className="score-sub">Notifications waiting for review</div>
          </div>

          <div className="card header-card">
            <div className="section-title">Today</div>
            <div className="score-value">{todayCount}</div>
            <div className="score-sub">New notifications received today</div>
          </div>
        </div>

        <div className={isStatusRoute ? '' : 'hr-grid'} style={{ marginTop: 14 }}>
          <div>
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">
                  {activeSideView === 'unread'
                    ? 'Unread Notifications - Full View'
                    : activeSideView === 'read'
                      ? 'Recently Read - Full View'
                      : 'Notification Feed'}
                </div>
                {activeSideView ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small notifications-action-back"
                    onClick={clearSideView}
                  >
                    Back to all notifications
                  </button>
                ) : null}
              </div>

              <div className="tabs" style={{ marginBottom: 14 }} role="tablist" aria-label="Notification filters">
                <button
                  className={`tab ${filter === 'ALL' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setFilter('ALL')}
                  role="tab"
                  aria-selected={filter === 'ALL'}
                  aria-controls="notifications-feed"
                >
                  All
                </button>
                <button
                  className={`tab ${filter === 'UNREAD' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setFilter('UNREAD')}
                  role="tab"
                  aria-selected={filter === 'UNREAD'}
                  aria-controls="notifications-feed"
                >
                  Unread
                </button>
                <button
                  className={`tab ${filter === 'READ' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setFilter('READ')}
                  role="tab"
                  aria-selected={filter === 'READ'}
                  aria-controls="notifications-feed"
                >
                  Read
                </button>
              </div>

              <div className="notifications-feed-filters" style={{ marginBottom: 16 }}>
                <div className="skills-search-wrapper" style={{ width: '100%' }}>
                  <span className="skills-search-icon">⌕</span>
                  <input
                    type="text"
                    placeholder="Search notifications by title, message, or type..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="skills-search-input"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      borderColor: 'var(--input-border)',
                    }}
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="select notifications-filter-select"
                  aria-label="Filter notifications by role"
                >
                  <option value="ALL">All Roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>

                {canFilterByDepartment ? (
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="select notifications-filter-select"
                    aria-label="Filter notifications by department"
                  >
                    <option value="ALL">All Departments</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div className="notifications-actions-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-small notifications-action-select"
                  onClick={allFeedSelected ? clearVisibleSelection : selectAllVisible}
                  disabled={feedNotifications.length === 0}
                >
                  {allFeedSelected ? 'Clear selection' : 'Select all'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small notifications-action-read"
                  onClick={markSelectedAsRead}
                  disabled={selectedInFeedCount === 0}
                >
                  Mark selected as read
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small notifications-action-delete"
                  onClick={deleteSelected}
                  disabled={selectedIds.size === 0}
                >
                  Delete selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
              </div>

              {loading ? (
                <div className="empty-state">Loading notifications...</div>
              ) : feedNotifications.length === 0 ? (
                <div className="empty-state">No notifications available.</div>
              ) : (
                <div className="notifications-page-list">
                  <div id="notifications-feed" className="sr-only" />
                  {feedNotifications.map(renderNotificationCard)}
                </div>
              )}
            </div>
          </div>

          {!isStatusRoute ? (
          <div className="hr-right">
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Unread Notifications</div>
                <span className="badge badge-medium">{unreadNotifications.length}</span>
              </div>

              {loading ? (
                <div className="notification-empty">Loading...</div>
              ) : unreadNotifications.length === 0 ? (
                <div className="notification-empty">No unread notifications.</div>
              ) : (
                <div className="stack">
                  {unreadPreview.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      className="history-item notification-side-item"
                      onClick={() => handleClick(item)}
                      aria-label={`Unread notification: ${item.title}`}
                    >
                      <div>
                        <div className="history-title">{item.title}</div>
                        <div className="history-date">{formatRelativeDate(item.createdAt)}</div>
                      </div>
                      <span className="notification-dot" aria-hidden="true" />
                    </button>
                  ))}
                  {unreadNotifications.length > 4 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => openSideView('unread')}
                      aria-label="Open full unread notifications page"
                    >
                      <FiMoreHorizontal size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Recently Read</div>
                <span className="badge">{readCount}</span>
              </div>

              {loading ? (
                <div className="notification-empty">Loading...</div>
              ) : readNotifications.length === 0 ? (
                <div className="notification-empty">No read notifications yet.</div>
              ) : (
                <div className="stack">
                  {readPreview.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      className="history-item notification-side-item"
                      onClick={() => handleClick(item)}
                      aria-label={`Read notification: ${item.title}`}
                    >
                      <div>
                        <div className="history-title">{item.title}</div>
                        <div className="history-date">{formatRelativeDate(item.createdAt)}</div>
                      </div>
                      <span className={getTypeBadgeClass(item.type)}>
                        {item.type.replaceAll('_', ' ')}
                      </span>
                    </button>
                  ))}
                  {readNotifications.length > 4 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => openSideView('read')}
                      aria-label="Open full read notifications page"
                    >
                      <FiMoreHorizontal size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
          ) : null}
        </div>

        {selectedNotification ? (
          <NotificationDetailModal
            notification={selectedNotification}
            onClose={closeDetailModal}
            onOpenLinkedPage={openLinkedPage}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            accountRequestStatus={accountRequestStatusByUserId[getRequestedUserId(selectedNotification)] || 'UNKNOWN'}
            accountRequestStatusLoading={accountRequestStatusLoading}
            actionLoading={requestActionLoading}
          />
        ) : null}
      </div>
    </div>
  );
}