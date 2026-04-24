import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiClock, FiFileText, FiMapPin, FiTarget, FiUser, FiUsers } from "react-icons/fi";
import { getActivityById, type ActivityRecord } from "../../services/activities.service";
import { getActivityInvitations } from "../../services/activityInvitations.service";
import type { ActivityInvitationItem } from "../../types/activity-invitations";
import { getMonitorDraftWithServer, type AttendanceMap } from "../../services/manager-activity-monitor.service";

type ParticipantRow = {
  id: string;
  name: string;
  invitationStatus: ActivityInvitationItem["status"];
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLabel(value?: string) {
  const src = String(value || "");
  return src ? src.charAt(0) + src.slice(1).toLowerCase().replace(/_/g, " ") : "—";
}

function getDayKeys(attendanceByParticipant: AttendanceMap): string[] {
  const daySet = new Set<string>();
  Object.values(attendanceByParticipant || {}).forEach((byDay) => {
    Object.keys(byDay || {}).forEach((day) => daySet.add(day));
  });
  return [...daySet].sort((a, b) => a.localeCompare(b));
}

function percentage(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function statusPillStyle(value: string) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "PRESENT") {
    return {
      color: "color-mix(in srgb, var(--text) 84%, #166534)",
      border: "1px solid color-mix(in srgb, var(--border) 72%, #22c55e)",
      background: "color-mix(in srgb, var(--surface) 88%, #22c55e)",
    };
  }
  if (normalized === "LATE") {
    return {
      color: "color-mix(in srgb, var(--text) 84%, #92400e)",
      border: "1px solid color-mix(in srgb, var(--border) 72%, #f59e0b)",
      background: "color-mix(in srgb, var(--surface) 88%, #f59e0b)",
    };
  }
  if (normalized === "EXCUSED") {
    return {
      color: "color-mix(in srgb, var(--text) 84%, #1d4ed8)",
      border: "1px solid color-mix(in srgb, var(--border) 72%, #3b82f6)",
      background: "color-mix(in srgb, var(--surface) 88%, #3b82f6)",
    };
  }
  return {
    color: "color-mix(in srgb, var(--text) 84%, #991b1b)",
    border: "1px solid color-mix(in srgb, var(--border) 72%, #ef4444)",
    background: "color-mix(in srgb, var(--surface) 88%, #ef4444)",
  };
}

export default function HrCompletedActivityDetailsPage() {
  const navigate = useNavigate();
  const { activityId = "" } = useParams();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [attendanceByParticipant, setAttendanceByParticipant] = useState<AttendanceMap>({});
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const [activityRow, invitations, monitor] = await Promise.all([
          getActivityById(activityId),
          getActivityInvitations(activityId),
          getMonitorDraftWithServer(activityId),
        ]);

        if (cancelled) return;

        const source = (invitations || []).filter((inv) => inv.status === "ACCEPTED");
        const rows = (source.length > 0 ? source : invitations || []).map((inv) => ({
          id: String(inv.employeeId || ""),
          name: inv.employeeName || "Unknown employee",
          invitationStatus: inv.status,
        }));

        setActivity(activityRow);
        setParticipants(rows);
        setAttendanceByParticipant(monitor?.attendanceByParticipant || {});
        setDayNotes(monitor?.dayNotes || {});
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load completed activity details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const dayKeys = useMemo(() => getDayKeys(attendanceByParticipant), [attendanceByParticipant]);
  const acceptedCount = useMemo(
    () => participants.filter((p) => String(p.invitationStatus).toUpperCase() === "ACCEPTED").length,
    [participants]
  );
  const trackedParticipants = useMemo(
    () =>
      participants.filter((p) =>
        dayKeys.some((day) => Boolean(attendanceByParticipant?.[p.id]?.[day]))
      ).length,
    [participants, dayKeys, attendanceByParticipant]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          Loading completed activity details...
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page">
        <div className="container" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "color-mix(in srgb, var(--text) 76%, #b91c1c)", marginBottom: 14 }}>
            {error || "Activity not found."}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/hr/activities/archive")}>
            <FiArrowLeft /> Back to completed activities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/hr/activities/archive")}>
            <FiArrowLeft /> Back to completed activities
          </button>
          <span className="badge">Completed details</span>
        </div>

        <section
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 20,
            display: "grid",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{activity.title}</h1>
              <div style={{ marginTop: 8, color: "var(--muted)", fontWeight: 700 }}>
                {formatLabel(activity.type)} · {formatLabel(activity.status)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge">{formatLabel(activity.priorityContext)}</span>
              <span className="badge">Target: {formatLabel(activity.targetLevel)}</span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Date range</div>
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <FiCalendar size={14} /> {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Duration & seats</div>
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <FiClock size={14} /> {activity.duration || "—"} · {activity.availableSlots} seats
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Department & manager</div>
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <FiUser size={14} /> {(activity.departmentName || "No department")} · {(activity.responsibleManagerName || "No manager")}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Location & created</div>
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <FiMapPin size={14} /> {activity.location || "—"} · {formatDate(activity.createdAt)}
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
              <FiFileText size={14} /> Description
            </div>
            <div style={{ marginTop: 6, lineHeight: 1.6, color: "var(--text)" }}>
              {activity.description || "No description provided."}
            </div>
          </div>
        </section>

        {error ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid color-mix(in srgb, var(--border) 68%, #ef4444)",
              background: "color-mix(in srgb, var(--surface) 90%, #ef4444)",
              color: "var(--text)",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Participant daily evaluations</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
            Daily manager monitoring history per participant (not final evaluation).
          </p>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Accepted participants</div>
              <div style={{ marginTop: 4, fontWeight: 900, fontSize: 22 }}>{acceptedCount}</div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Tracked participants</div>
              <div style={{ marginTop: 4, fontWeight: 900, fontSize: 22 }}>{trackedParticipants}</div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Attendance coverage</div>
              <div style={{ marginTop: 4, fontWeight: 900, fontSize: 22 }}>
                {percentage(trackedParticipants, participants.length)}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, background: "var(--surface-2)" }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Tracked days</div>
              <div style={{ marginTop: 4, fontWeight: 900, fontSize: 22 }}>{dayKeys.length}</div>
            </div>
          </div>

          {participants.length === 0 ? (
            <div style={{ marginTop: 14, padding: 16, border: "1px dashed var(--border)", borderRadius: 12, color: "var(--muted)" }}>
              No participants found for this activity.
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {participants.map((p) => (
                <div key={p.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--surface-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <span className="badge">{formatLabel(p.invitationStatus)}</span>
                  </div>
                  {dayKeys.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      No daily evaluations available.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {dayKeys.map((day) => {
                        const status = attendanceByParticipant?.[p.id]?.[day] || "NOT_MARKED";
                        const pill = statusPillStyle(status);
                        return (
                          <span
                            key={`${p.id}:${day}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 8px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              ...pill,
                            }}
                          >
                            {formatDate(day)}: {formatLabel(status)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {dayKeys.length > 0 && Object.keys(dayNotes).length > 0 ? (
          <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Daily notes</h2>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {dayKeys
                .filter((day) => String(dayNotes[day] || "").trim())
                .map((day) => (
                  <div key={day} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{formatDate(day)}</div>
                    <div style={{ whiteSpace: "pre-wrap", color: "var(--muted)" }}>{dayNotes[day]}</div>
                  </div>
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
