import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiFlag, FiPlayCircle, FiUsers } from "react-icons/fi";
import { getActivityById, type ActivityRecord } from "../../services/activities.service";
import { getActivityInvitations } from "../../services/activityInvitations.service";
import type { ActivityInvitationItem } from "../../types/activity-invitations";
import {
  buildDateRange,
  ensureAttendanceMap,
  getMonitorDraftWithServer,
  saveMonitorDraftWithServer,
  type AttendanceMap,
  type DailyAttendanceStatus,
} from "../../services/manager-activity-monitor.service";

type ParticipantRow = {
  id: string;
  name: string;
  role: string;
  invitationStatus: ActivityInvitationItem["status"];
};

function cardStyle() {
  return {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    boxShadow: "var(--shadow)",
  };
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatNiceDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortId(v?: string) {
  if (!v) return "unknown";
  return v.slice(-6);
}

function getAttendanceBadge(value: DailyAttendanceStatus) {
  if (value === "PRESENT")
    return {
      color: "color-mix(in srgb, var(--text) 84%, #166534)",
      bg: "color-mix(in srgb, var(--surface) 86%, #22c55e)",
      bd: "color-mix(in srgb, var(--border) 68%, #22c55e)",
    };
  if (value === "LATE")
    return {
      color: "color-mix(in srgb, var(--text) 84%, #92400e)",
      bg: "color-mix(in srgb, var(--surface) 86%, #f59e0b)",
      bd: "color-mix(in srgb, var(--border) 68%, #f59e0b)",
    };
  if (value === "EXCUSED")
    return {
      color: "color-mix(in srgb, var(--text) 84%, #1d4ed8)",
      bg: "color-mix(in srgb, var(--surface) 88%, #3b82f6)",
      bd: "color-mix(in srgb, var(--border) 70%, #3b82f6)",
    };
  return {
    color: "color-mix(in srgb, var(--text) 84%, #991b1b)",
    bg: "color-mix(in srgb, var(--surface) 88%, #ef4444)",
    bd: "color-mix(in srgb, var(--border) 70%, #ef4444)",
  };
}

export default function ManagerInProgressActivityPage() {
  const navigate = useNavigate();
  const { activityId = "" } = useParams();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const [selectedDay, setSelectedDay] = useState("");
  const [attendanceByParticipant, setAttendanceByParticipant] = useState<AttendanceMap>({});
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});

  const activityDays = useMemo(
    () => buildDateRange(activity?.startDate, activity?.endDate),
    [activity?.startDate, activity?.endDate]
  );

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const [a, invites] = await Promise.all([
          getActivityById(activityId),
          getActivityInvitations(activityId),
        ]);
        if (cancelled) return;

        const active = (invites || []).filter((inv) =>
          inv.status === "ACCEPTED" || inv.status === "INVITED"
        );
        const source = active.length > 0 ? active : invites || [];
        const seen = new Set<string>();
        const rows: ParticipantRow[] = source
          .filter((inv) => {
            const id = String(inv.employeeId || "");
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .map((inv) => ({
          id: inv.employeeId,
          name: inv.employeeName || `Employee ${shortId(inv.employeeId)}`,
          role: "Participant",
          invitationStatus: inv.status,
          }));

        const days = buildDateRange(a.startDate, a.endDate);
        const draft = await getMonitorDraftWithServer(activityId);
        const normalizedAttendance = ensureAttendanceMap(
          rows.map((r) => r.id),
          days,
          draft.attendanceByParticipant
        );

        setActivity(a);
        setParticipants(rows);
        setAttendanceByParticipant(normalizedAttendance);
        setDayNotes(draft.dayNotes || {});
        setSelectedDay(days[0] || "");

      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load activity monitor.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const selectedDayStats = useMemo(() => {
    const statuses = participants.map((p) => attendanceByParticipant[p.id]?.[selectedDay] || "ABSENT");
    return {
      present: statuses.filter((s) => s === "PRESENT").length,
      late: statuses.filter((s) => s === "LATE").length,
      absent: statuses.filter((s) => s === "ABSENT").length,
      excused: statuses.filter((s) => s === "EXCUSED").length,
    };
  }, [participants, attendanceByParticipant, selectedDay]);

  const remainingDays = useMemo(() => {
    const idx = activityDays.findIndex((d) => d === selectedDay);
    if (idx < 0) return 0;
    return Math.max(activityDays.length - idx - 1, 0);
  }, [activityDays, selectedDay]);

  const executionProgressPercent = useMemo(() => {
    if (activityDays.length === 0) return 0;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const firstDay = activityDays[0];
    const lastDay = activityDays[activityDays.length - 1];

    if (todayKey < firstDay) return 0;
    if (todayKey > lastDay) return 100;

    const dayIndex = activityDays.findIndex((d) => d === todayKey);
    if (dayIndex < 0) {
      // If today isn't exactly in the range list (timezone edge), keep a safe rounded fallback.
      return Math.min(100, Math.max(0, Math.round((1 / activityDays.length) * 100)));
    }
    return Math.round(((dayIndex + 1) / activityDays.length) * 100);
  }, [activityDays]);

  const dayNote = dayNotes[selectedDay] || "";
  const todayKey = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const canMarkSelectedDay = selectedDay === todayKey;

  function updateAttendance(participantId: string, day: string, status: DailyAttendanceStatus) {
    setAttendanceByParticipant((prev) => {
      const next = {
        ...prev,
        [participantId]: {
          ...(prev[participantId] || {}),
          [day]: status,
        },
      };
      void saveMonitorDraftWithServer(activityId, { attendanceByParticipant: next });
      return next;
    });
  }

  function saveDay() {
    void saveMonitorDraftWithServer(activityId, { attendanceByParticipant, dayNotes });
    setFlash(`Attendance saved for ${formatNiceDate(selectedDay)}.`);
    window.setTimeout(() => setFlash(""), 1800);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--muted)" }}>Loading activity monitor…</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p
            style={{
              color: "color-mix(in srgb, var(--text) 78%, #b91c1c)",
              fontWeight: 700,
            }}
          >
            {error || "Activity not found."}
          </p>
          <button className="btn btn-ghost" type="button" onClick={() => navigate("/manager/activities/running")}>
            <FiArrowLeft /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={{ ...cardStyle(), padding: 22, display: "grid", gap: 14 }}>
          <button type="button" className="btn btn-ghost" style={{ width: "fit-content" }} onClick={() => navigate("/manager/activities/running")}>
            <FiArrowLeft /> Back to activities
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color:
                    "color-mix(in srgb, var(--text) 72%, var(--sidebar-link-active-pill))",
                  textTransform: "uppercase",
                }}
              >
                Activity monitor
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.1, marginTop: 8 }}>{activity.title}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  className="badge"
                  style={{
                    background:
                      "color-mix(in srgb, var(--surface) 86%, var(--sidebar-link-active-pill))",
                    color:
                      "color-mix(in srgb, var(--text) 84%, var(--sidebar-link-active-pill))",
                    border:
                      "1px solid color-mix(in srgb, var(--border) 68%, var(--sidebar-link-active-pill))",
                  }}
                >
                  <FiPlayCircle size={14} /> In progress
                </span>
                <span className="badge">{formatLabel(activity.type)}</span>
                <span className="badge">{activity.availableSlots} seats</span>
                <span className="badge">Activity ID: {activity._id}</span>
              </div>
            </div>
            <div style={{ minWidth: 300, flex: "1 1 360px", maxWidth: 420, display: "grid", gap: 10 }}>
              <div
                style={{
                  borderRadius: 14,
                  background:
                    "color-mix(in srgb, var(--surface) 90%, var(--sidebar-link-active-pill))",
                  border:
                    "1px solid color-mix(in srgb, var(--border) 70%, var(--sidebar-link-active-pill))",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    fontWeight: 800,
                    color:
                      "color-mix(in srgb, var(--text) 80%, var(--sidebar-link-active-pill))",
                  }}
                >
                  <span>Execution progress</span>
                  <span>{executionProgressPercent}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginTop: 8 }}>
                  <div
                    style={{
                      width: `${executionProgressPercent}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, color-mix(in srgb, var(--text) 36%, #6366f1) 0%, color-mix(in srgb, var(--text) 36%, var(--sidebar-link-active-pill)) 100%)",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 12,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Start</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>{activity.startDate || "—"}</div>
                </div>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 12,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>End</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>{activity.endDate || "—"}</div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                icon: <FiCalendar size={17} />,
                label: "Duration",
                value: activity.duration || `${activityDays.length || 0} days`,
              },
              {
                icon: <FiUsers size={17} />,
                label: "Department",
                value: activity.departmentName || "—",
              },
              {
                icon: <FiFlag size={17} />,
                label: "Priority",
                value: formatLabel(activity.targetLevel || "MEDIUM"),
              },
              {
                icon: <FiClock size={17} />,
                label: "Context",
                value: formatLabel(activity.priorityContext || "DEVELOPMENT"),
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 14,
                  background: "var(--surface)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    color: "var(--muted)",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {item.icon}
                  {item.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.05 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {error ? (
            <div style={{ color: "color-mix(in srgb, var(--text) 78%, #b91c1c)", fontWeight: 700 }}>
              {error}
            </div>
          ) : null}
          {flash ? (
            <div
              style={{
                color:
                  "color-mix(in srgb, var(--text) 84%, var(--sidebar-link-active-pill))",
                fontWeight: 700,
              }}
            >
              <FiCheckCircle style={{ marginRight: 6 }} />
              {flash}
            </div>
          ) : null}
        </section>

        <section style={{ ...cardStyle(), padding: 22, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Daily attendance tracker</div>
              <div style={{ color: "var(--muted)" }}>Select a day, update attendance, then save.</div>
            </div>
            <span className="badge">{activityDays.length} tracked days</span>
          </div>

          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
            {activityDays.map((day, idx) => {
              const active = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  style={{
                    minWidth: 160,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: active
                      ? "1px solid color-mix(in srgb, var(--border) 70%, #3b82f6)"
                      : "1px solid var(--border)",
                    background: active
                      ? "color-mix(in srgb, var(--surface) 90%, #3b82f6)"
                      : "var(--surface)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Day {idx + 1}</div>
                  <div style={{ fontWeight: 800 }}>{formatNiceDate(day)}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            {[
              { label: "Present", value: selectedDayStats.present },
              { label: "Late", value: selectedDayStats.late },
              { label: "Absent", value: selectedDayStats.absent },
              { label: "Excused", value: selectedDayStats.excused },
              { label: "Days remaining", value: remainingDays },
            ].map((it) => (
              <div key={it.label} style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{it.label}</div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{it.value}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 920, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Employee", "Role", "Selected day", "Set attendance"].map((head) => (
                    <th key={head} style={{ textAlign: "left", padding: "12px 10px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((row) => {
                  const status = attendanceByParticipant[row.id]?.[selectedDay] || "ABSENT";
                  const badge = getAttendanceBadge(status);
                  return (
                    <tr key={row.id}>
                      <td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border)", fontWeight: 800 }}>{row.name}</td>
                      <td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{row.role}</td>
                      <td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 12, color: badge.color, background: badge.bg, border: `1px solid ${badge.bd}` }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border)" }}>
                        <select
                          value={status}
                          onChange={(e) => updateAttendance(row.id, selectedDay, e.target.value as DailyAttendanceStatus)}
                          disabled={!canMarkSelectedDay}
                          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "9px 10px", background: "var(--surface)", color: "var(--text)" }}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="LATE">Late</option>
                          <option value="ABSENT">Absent</option>
                          <option value="EXCUSED">Excused</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Note for {formatNiceDate(selectedDay)}</span>
              <textarea
                rows={4}
                value={dayNote}
                onChange={(e) =>
                  setDayNotes((prev) => {
                    const next = { ...prev, [selectedDay]: e.target.value };
                    void saveMonitorDraftWithServer(activityId, { dayNotes: next });
                    return next;
                  })
                }
                placeholder="Write what happened during this day..."
                style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", resize: "vertical", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit" }}
              />
            </label>
            <button
              className="btn btn-primary"
              type="button"
              onClick={saveDay}
              disabled={!canMarkSelectedDay}
              style={{ height: "fit-content" }}
            >
              <FiCheckCircle /> Save day
            </button>
          </div>
          {!canMarkSelectedDay ? (
            <div style={{ color: "color-mix(in srgb, var(--text) 84%, #92400e)", fontWeight: 700, fontSize: 13 }}>
              Attendance can only be marked for today ({todayKey}).
            </div>
          ) : null}
        </section>

      </div>
    </div>
  );
}
