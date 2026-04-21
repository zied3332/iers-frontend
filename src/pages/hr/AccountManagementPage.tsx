import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveUserAccount,
  getUsers,
  rejectUserAccount,
  type User,
} from "../../services/users.service";
import { getAllDepartments } from "../../services/departments.service";

type AccountApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNKNOWN";

function normalizeApprovalStatus(value: unknown): AccountApprovalStatus {
  const v = String(value || "").trim().toUpperCase();
  if (v === "PENDING") return "PENDING";
  if (v === "APPROVED") return "APPROVED";
  if (v === "REJECTED") return "REJECTED";
  return "UNKNOWN";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function byNewest(a: User, b: User) {
  const aTime = new Date(a.createdAt || 0).getTime();
  const bTime = new Date(b.createdAt || 0).getTime();
  return bTime - aTime;
}

function getDepartmentIdFromUser(user: User): string {
  const asAny = user as any;
  if (typeof asAny?.department === "string" && asAny.department.trim()) {
    return asAny.department.trim();
  }
  if (typeof asAny?.departement_id === "string" && asAny.departement_id.trim()) {
    return asAny.departement_id.trim();
  }
  if (asAny?.departement_id && typeof asAny.departement_id === "object") {
    const id = asAny.departement_id?._id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return "";
}

function initialsFromName(name?: string) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusPill({ status }: { status: AccountApprovalStatus }) {
  const map = {
    PENDING: { bg: "rgba(245,158,11,0.14)", fg: "#b45309" },
    APPROVED: { bg: "var(--primary-weak)", fg: "var(--primary-soft-text)" },
    REJECTED: { bg: "rgba(239,68,68,0.14)", fg: "#b91c1c" },
    UNKNOWN: { bg: "rgba(100,116,139,0.16)", fg: "#334155" },
  } as const;
  const tone = map[status];
  return (
    <span
      style={{
        background: tone.bg,
        color: tone.fg,
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 12,
        padding: "4px 10px",
      }}
    >
      {status}
    </span>
  );
}

function DetailsRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <strong style={{ fontSize: 14, color: "var(--text)" }}>{value || "—"}</strong>
    </div>
  );
}

function AccountDetailsModal({
  user,
  departmentName,
  onClose,
}: {
  user: User;
  departmentName: string;
  onClose: () => void;
}) {
  const status = normalizeApprovalStatus(user.approvalStatus);
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: 80 }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(760px, 95vw)" }}
      >
        <div className="modal-header">
          <div>
            <h2>Account Request Details</h2>
            <p>Review full account information before decision.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div
            className="card"
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text)",
              }}
            >
              {initialsFromName(user.name)}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "var(--text)" }}>{user.name || "Unnamed user"}</div>
              <div className="muted" style={{ fontSize: 13 }}>{user.email || "—"}</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <StatusPill status={status} />
            </div>
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
            <DetailsRow label="Role" value={user.role || "EMPLOYEE"} />
            <div style={{ height: 10 }} />
            <DetailsRow label="Matricule" value={user.matricule} />
            <div style={{ height: 10 }} />
            <DetailsRow label="Phone" value={user.telephone} />
            <div style={{ height: 10 }} />
            <DetailsRow label="Department" value={departmentName} />
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
            <DetailsRow label="Hire Date" value={formatDate(user.date_embauche)} />
            <div style={{ height: 10 }} />
            <DetailsRow label="Requested At" value={formatDate(user.createdAt)} />
            <div style={{ height: 10 }} />
            <DetailsRow label="Last Update" value={formatDate(user.updatedAt)} />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  user,
  onApprove,
  onReject,
  onOpenDetails,
  processing,
}: {
  user: User;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onOpenDetails: (user: User) => void;
  processing: boolean;
}) {
  const status = normalizeApprovalStatus(user.approvalStatus);
  const canDecide = status === "PENDING";

  return (
    <div
      className="card"
      style={{
        padding: 14,
        border: "1px solid var(--border)",
        borderRadius: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
              flexShrink: 0,
            }}
          >
            {initialsFromName(user.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ color: "var(--text)", display: "block" }}>{user.name || "Unnamed user"}</strong>
            <div className="muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email || "—"}
            </div>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <DetailsRow label="Matricule" value={user.matricule} />
        <DetailsRow label="Role" value={user.role || "EMPLOYEE"} />
        <DetailsRow label="Phone" value={user.telephone} />
        <DetailsRow label="Requested At" value={formatDate(user.createdAt)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn"
          onClick={() => onOpenDetails(user)}
          style={{ border: "1px solid var(--border)" }}
        >
          View details
        </button>

        {canDecide ? (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => onReject(user._id)}
              disabled={processing}
              style={{ border: "1px solid rgba(239,68,68,0.30)", color: "#b91c1c" }}
            >
              Reject
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onApprove(user._id)}
              disabled={processing}
            >
              {processing ? "Processing..." : "Approve"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  sectionKey,
  title,
  subtitle,
  count,
  users,
  expanded,
  onToggleExpanded,
  onApprove,
  onReject,
  onOpenDetails,
  processingUserId,
}: {
  sectionKey: string;
  title: string;
  subtitle: string;
  count: number;
  users: User[];
  expanded: boolean;
  onToggleExpanded: (key: string) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onOpenDetails: (user: User) => void;
  processingUserId: string;
}) {
  const visibleUsers = expanded ? users : users.slice(0, 3);
  const hasOverflow = users.length > 3;

  return (
    <section className="card section-card" style={{ padding: 14 }}>
      <div className="section-head" style={{ marginBottom: 10 }}>
        <div>
          <div className="section-title">{title}</div>
          <div className="muted" style={{ fontSize: 13 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge">{count}</span>
          {hasOverflow ? (
            <button
              type="button"
              className="btn"
              style={{ height: 34, padding: "0 12px", fontSize: 12 }}
              onClick={() => onToggleExpanded(sectionKey)}
            >
              {expanded ? "View less" : `View more (${users.length - 3})`}
            </button>
          ) : null}
        </div>
      </div>
      {users.length === 0 ? (
        <div className="empty-state">No accounts in this section.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 10,
          }}
        >
          {visibleUsers.map((user) => (
            <RequestCard
              key={user._id}
              user={user}
              onApprove={onApprove}
              onReject={onReject}
              onOpenDetails={onOpenDetails}
              processing={processingUserId === user._id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function AccountManagementPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [departmentNamesById, setDepartmentNamesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingUserId, setProcessingUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pending: false,
    approved: false,
    rejected: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [users, departments] = await Promise.all([getUsers(), getAllDepartments()]);
      const depMap: Record<string, string> = {};
      for (const dep of Array.isArray(departments) ? departments : []) {
        const id = String(dep?._id || "").trim();
        const name = String(dep?.name || "").trim();
        if (id && name) depMap[id] = name;
      }
      setRows(Array.isArray(users) ? users : []);
      setDepartmentNamesById(depMap);
    } catch (e: any) {
      setError(e?.message || "Failed to load account requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approvalUsers = useMemo(() => {
    return rows
      .filter((user) => String(user.role || "").toUpperCase() === "EMPLOYEE")
      .filter((user) => normalizeApprovalStatus(user.approvalStatus) !== "UNKNOWN");
  }, [rows]);

  const pending = useMemo(
    () =>
      approvalUsers
        .filter((u) => normalizeApprovalStatus(u.approvalStatus) === "PENDING")
        .sort(byNewest),
    [approvalUsers]
  );
  const approved = useMemo(
    () =>
      approvalUsers
        .filter((u) => normalizeApprovalStatus(u.approvalStatus) === "APPROVED")
        .sort(byNewest),
    [approvalUsers]
  );
  const rejected = useMemo(
    () =>
      approvalUsers
        .filter((u) => normalizeApprovalStatus(u.approvalStatus) === "REJECTED")
        .sort(byNewest),
    [approvalUsers]
  );

  const runDecision = useCallback(
    async (userId: string, decision: "APPROVED" | "REJECTED") => {
      const confirmed = window.confirm(
        decision === "APPROVED"
          ? "Approve this account request?"
          : "Reject this account request?"
      );
      if (!confirmed) return;

      setProcessingUserId(userId);
      setError("");

      try {
        if (decision === "APPROVED") {
          await approveUserAccount(userId);
        } else {
          await rejectUserAccount(userId);
        }
        setRows((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, approvalStatus: decision } : u
          )
        );
        setSelectedUser((prev) =>
          prev && prev._id === userId ? { ...prev, approvalStatus: decision } : prev
        );
      } catch (e: any) {
        setError(e?.message || "Failed to apply account decision.");
      } finally {
        setProcessingUserId("");
      }
    },
    []
  );

  const selectedDepartmentName = useMemo(() => {
    if (!selectedUser) return "—";
    const key = getDepartmentIdFromUser(selectedUser);
    if (!key) return "—";
    return departmentNamesById[key] || key;
  }, [selectedUser, departmentNamesById]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Management</h1>
          <p className="page-subtitle">
            Validate new account requests before first login.
          </p>
        </div>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <div className="card header-card">
          <div className="section-title">Pending Requests</div>
          <div className="score-value">{pending.length}</div>
          <div className="score-sub">Not answered yet</div>
        </div>
        <div className="card header-card">
          <div className="section-title">Approved Requests</div>
          <div className="score-value">{approved.length}</div>
          <div className="score-sub">Allowed to log in</div>
        </div>
        <div className="card header-card">
          <div className="section-title">Rejected Requests</div>
          <div className="score-value">{rejected.length}</div>
          <div className="score-sub">Declined by HR</div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          <span>{error}</span>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <Section
          sectionKey="pending"
          title="Account Requests (Pending)"
          subtitle="New signup requests waiting for decision."
          count={pending.length}
          users={pending}
          expanded={Boolean(expandedSections.pending)}
          onToggleExpanded={toggleExpanded}
          onApprove={(id) => void runDecision(id, "APPROVED")}
          onReject={(id) => void runDecision(id, "REJECTED")}
          onOpenDetails={setSelectedUser}
          processingUserId={processingUserId}
        />
        <Section
          sectionKey="approved"
          title="Approved Accounts"
          subtitle="Accounts already accepted by HR."
          count={approved.length}
          users={approved}
          expanded={Boolean(expandedSections.approved)}
          onToggleExpanded={toggleExpanded}
          onApprove={(id) => void runDecision(id, "APPROVED")}
          onReject={(id) => void runDecision(id, "REJECTED")}
          onOpenDetails={setSelectedUser}
          processingUserId={processingUserId}
        />
        <Section
          sectionKey="rejected"
          title="Declined Accounts"
          subtitle="Accounts rejected by HR."
          count={rejected.length}
          users={rejected}
          expanded={Boolean(expandedSections.rejected)}
          onToggleExpanded={toggleExpanded}
          onApprove={(id) => void runDecision(id, "APPROVED")}
          onReject={(id) => void runDecision(id, "REJECTED")}
          onOpenDetails={setSelectedUser}
          processingUserId={processingUserId}
        />
      </div>

      {selectedUser ? (
        <AccountDetailsModal
          user={selectedUser}
          departmentName={selectedDepartmentName}
          onClose={() => setSelectedUser(null)}
        />
      ) : null}
    </div>
  );
}
