import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFlag,
  FiPlayCircle,
  FiSend,
  FiUsers,
} from "react-icons/fi";

type DailyAttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type AttendanceStatus = "EXCELLENT" | "GOOD" | "IRREGULAR" | "POOR";
type ParticipationLevel = "VERY_ACTIVE" | "ACTIVE" | "MODERATE" | "LOW";
type SkillProgress = "STRONG" | "MODERATE" | "SLIGHT" | "NONE";
type EvaluationOutcome =
  | "COMPLETED_SUCCESSFULLY"
  | "NEEDS_FOLLOW_UP"
  | "DID_NOT_COMPLETE";
type Recommendation =
  | "ADVANCED_TRAINING"
  | "PROJECT_ASSIGNMENT"
  | "MENTORING"
  | "RETRY_LATER";

type ParticipantRow = {
  id: string;
  name: string;
  role: string;
  score: number;
  invitationStatus: "ACCEPTED" | "DECLINED" | "PENDING";
  progress: number;
  participationBadge: "High" | "Medium" | "Low";
  evaluationStatus: "PENDING" | "SAVED" | "SUBMITTED";
};

type EvaluationDraft = {
  attendanceStatus: AttendanceStatus;
  participationLevel: ParticipationLevel;
  skillProgress: SkillProgress;
  outcome: EvaluationOutcome;
  recommendation: Recommendation;
  rating: number;
  comment: string;
};

type AttendanceMap = Record<string, Record<string, DailyAttendanceStatus>>;

const mockActivity = {
  id: "activity-1",
  title: "Docker & Kubernetes Fundamentals",
  type: "TRAINING",
  status: "IN_PROGRESS",
  workflowStatus: "IN_PROGRESS",
  department: "Infrastructure",
  manager: "Manager Workspace",
  location: "Meeting Room B / Online",
  context: "UPSKILLING",
  priority: "MEDIUM",
  startDate: "2026-03-30",
  endDate: "2026-04-05",
  duration: "7 days",
  seats: 3,
  completionPercent: 68,
};

const mockParticipants: ParticipantRow[] = [
  {
    id: "p1",
    name: "ziedemp1",
    role: "Backend Engineer",
    score: 52,
    invitationStatus: "ACCEPTED",
    progress: 80,
    participationBadge: "High",
    evaluationStatus: "PENDING",
  },
  {
    id: "p2",
    name: "ahlem1",
    role: "DevOps Engineer",
    score: 51,
    invitationStatus: "ACCEPTED",
    progress: 100,
    participationBadge: "Medium",
    evaluationStatus: "SAVED",
  },
  {
    id: "p3",
    name: "slimi.com",
    role: "Cloud Engineer",
    score: 51,
    invitationStatus: "ACCEPTED",
    progress: 65,
    participationBadge: "High",
    evaluationStatus: "PENDING",
  },
];

const defaultEvaluation: EvaluationDraft = {
  attendanceStatus: "GOOD",
  participationLevel: "ACTIVE",
  skillProgress: "MODERATE",
  outcome: "COMPLETED_SUCCESSFULLY",
  recommendation: "ADVANCED_TRAINING",
  rating: 4,
  comment: "",
};

function badgeStyle(
  kind:
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "primary"
) {
  const map = {
    success: {
      background: "rgba(34,197,94,0.12)",
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.28)",
    },
    warning: {
      background: "rgba(245,158,11,0.12)",
      color: "#92400e",
      border: "1px solid rgba(245,158,11,0.3)",
    },
    danger: {
      background: "rgba(239,68,68,0.1)",
      color: "#991b1b",
      border: "1px solid rgba(239,68,68,0.24)",
    },
    info: {
      background: "rgba(59,130,246,0.1)",
      color: "#1d4ed8",
      border: "1px solid rgba(59,130,246,0.22)",
    },
    neutral: {
      background: "rgba(148,163,184,0.12)",
      color: "#475569",
      border: "1px solid rgba(148,163,184,0.22)",
    },
    primary: {
      background: "rgba(99,102,241,0.1)",
      color: "#4338ca",
      border: "1px solid rgba(99,102,241,0.22)",
    },
  };

  return {
    ...map[kind],
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800 as const,
    letterSpacing: "0.04em",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function cardStyle() {
  return {
    background: "var(--card, #fff)",
    border: "1px solid var(--border, #dbe2ea)",
    borderRadius: 24,
    boxShadow: "var(--shadow, 0 10px 30px rgba(15,23,42,0.05))",
  };
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatNiceDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days: string[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getAttendanceBadge(value: DailyAttendanceStatus) {
  if (value === "PRESENT") return badgeStyle("success");
  if (value === "LATE") return badgeStyle("warning");
  if (value === "EXCUSED") return badgeStyle("info");
  return badgeStyle("danger");
}

function getEvaluationBadge(value: ParticipantRow["evaluationStatus"]) {
  if (value === "SUBMITTED") return badgeStyle("success");
  if (value === "SAVED") return badgeStyle("info");
  return badgeStyle("warning");
}

function getParticipationBadge(value: ParticipantRow["participationBadge"]) {
  if (value === "High") return badgeStyle("success");
  if (value === "Medium") return badgeStyle("primary");
  return badgeStyle("neutral");
}

function buildInitialAttendance(
  participantIds: string[],
  days: string[]
): AttendanceMap {
  const result: AttendanceMap = {};

  participantIds.forEach((id, index) => {
    result[id] = {};
    days.forEach((day, dayIndex) => {
      if (index === 0) {
        result[id][day] = dayIndex < 5 ? "PRESENT" : "LATE";
      } else if (index === 1) {
        result[id][day] = dayIndex === 2 ? "EXCUSED" : "PRESENT";
      } else {
        result[id][day] = dayIndex === 1 ? "ABSENT" : "PRESENT";
      }
    });
  });

  return result;
}

export default function ManagerInProgressActivityPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();

  const participants = mockParticipants;
  const activityDays = useMemo(
    () => getDateRange(mockActivity.startDate, mockActivity.endDate),
    []
  );

  const [selectedDay, setSelectedDay] = useState<string>(activityDays[0] ?? "");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    mockParticipants[0]?.id ?? ""
  );
  const [dayNote, setDayNote] = useState(
    "Docker basics workshop completed. Good engagement overall."
  );

  const [attendanceByParticipant, setAttendanceByParticipant] =
    useState<AttendanceMap>(() =>
      buildInitialAttendance(
        mockParticipants.map((p) => p.id),
        activityDays
      )
    );

  const [evaluations, setEvaluations] = useState<Record<string, EvaluationDraft>>({
    [mockParticipants[0].id]: {
      ...defaultEvaluation,
      comment: "Good engagement during the practical workshop.",
    },
  });

  const [finalReport, setFinalReport] = useState(
    "Overall, the activity is progressing well. Participants are engaged and showing visible improvement in core containerization concepts."
  );

  const selectedParticipant =
    participants.find((p) => p.id === selectedParticipantId) ?? participants[0];

  const selectedEvaluation =
    (selectedParticipant && evaluations[selectedParticipant.id]) || defaultEvaluation;

  const selectedDayStats = useMemo(() => {
    const statuses = participants.map(
      (p) => attendanceByParticipant[p.id]?.[selectedDay] || "ABSENT"
    );

    return {
      present: statuses.filter((s) => s === "PRESENT").length,
      late: statuses.filter((s) => s === "LATE").length,
      absent: statuses.filter((s) => s === "ABSENT").length,
      excused: statuses.filter((s) => s === "EXCUSED").length,
    };
  }, [participants, attendanceByParticipant, selectedDay]);

  const overallStats = useMemo(() => {
    const confirmed = participants.filter(
      (p) => p.invitationStatus === "ACCEPTED"
    ).length;
    const pending = participants.filter(
      (p) => p.evaluationStatus === "PENDING"
    ).length;
    const submitted = participants.filter(
      (p) => p.evaluationStatus === "SUBMITTED"
    ).length;

    const dayIndex = activityDays.findIndex((d) => d === selectedDay);
    const remainingDays =
      dayIndex >= 0 ? Math.max(activityDays.length - dayIndex - 1, 0) : 0;

    return {
      confirmed,
      pending,
      submitted,
      remainingDays,
    };
  }, [participants, activityDays, selectedDay]);

  function updateSelectedEvaluation<K extends keyof EvaluationDraft>(
    key: K,
    value: EvaluationDraft[K]
  ) {
    if (!selectedParticipant) return;

    setEvaluations((prev) => ({
      ...prev,
      [selectedParticipant.id]: {
        ...(prev[selectedParticipant.id] || defaultEvaluation),
        [key]: value,
      },
    }));
  }

  function updateAttendance(
    participantId: string,
    day: string,
    status: DailyAttendanceStatus
  ) {
    setAttendanceByParticipant((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] || {}),
        [day]: status,
      },
    }));
  }

  function saveDayAttendance() {
    alert(`Attendance saved for ${formatNiceDate(selectedDay)}`);
  }

  function saveEvaluationDraft() {
    if (!selectedParticipant) return;
    alert(`Draft saved for ${selectedParticipant.name}`);
  }

  function submitEvaluation() {
    if (!selectedParticipant) return;
    alert(`Evaluation submitted for ${selectedParticipant.name}`);
  }

  function sendFinalReportToHr() {
    alert("Final manager report sent to HR.");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #f4f7fb)",
        color: "var(--text, #0f172a)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto", display: "grid", gap: 20 }}>
        <section
          style={{
            ...cardStyle(),
            padding: "24px 24px 20px",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate("/manager/activities/running")}
                className="btn btn-ghost"
                style={{ width: "fit-content" }}
              >
                <FiArrowLeft /> Back to activities
              </button>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color: "var(--sidebar-link-active-pill, #10b981)",
                  textTransform: "uppercase",
                }}
              >
                Activity monitor
              </div>

              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05 }}>
                {mockActivity.title}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={badgeStyle("success")}>
                  <FiPlayCircle size={14} />
                  In progress
                </span>
                <span style={badgeStyle("primary")}>
                  {formatLabel(mockActivity.type)}
                </span>
                <span style={badgeStyle("neutral")}>
                  {mockActivity.seats} seats
                </span>
                <span style={badgeStyle("info")}>
                  Activity ID: {activityId || mockActivity.id}
                </span>
              </div>
            </div>

            <div
              style={{
                minWidth: 280,
                flex: "1 1 320px",
                maxWidth: 420,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.18)",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#065f46",
                  }}
                >
                  <span>Execution progress</span>
                  <span>{mockActivity.completionPercent}%</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${mockActivity.completionPercent}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, #6366f1 0%, #10b981 100%)",
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
                    border: "1px solid var(--border, #dbe2ea)",
                    borderRadius: 18,
                    padding: 14,
                    background: "var(--surface, #fff)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                    Start
                  </div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>
                    {mockActivity.startDate}
                  </div>
                </div>
                <div
                  style={{
                    border: "1px solid var(--border, #dbe2ea)",
                    borderRadius: 18,
                    padding: 14,
                    background: "var(--surface, #fff)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                    End
                  </div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>
                    {mockActivity.endDate}
                  </div>
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
                icon: <FiCalendar size={18} />,
                label: "Duration",
                value: mockActivity.duration,
              },
              {
                icon: <FiUsers size={18} />,
                label: "Department",
                value: mockActivity.department,
              },
              {
                icon: <FiFlag size={18} />,
                label: "Priority",
                value: formatLabel(mockActivity.priority),
              },
              {
                icon: <FiClock size={18} />,
                label: "Context",
                value: formatLabel(mockActivity.context),
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: "1px solid var(--border, #dbe2ea)",
                  borderRadius: 18,
                  padding: 16,
                  background: "var(--surface, #fff)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    color: "var(--muted, #64748b)",
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
                <div style={{ fontSize: 18, fontWeight: 900 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            ...cardStyle(),
            padding: 22,
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Daily attendance tracker</div>
              <div style={{ color: "var(--muted, #64748b)", marginTop: 6 }}>
                Switch between activity days, mark attendance, and review previous days.
              </div>
            </div>

            <span style={badgeStyle("primary")}>
              {activityDays.length} tracked days
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {activityDays.map((day, index) => {
              const active = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  style={{
                    minWidth: 160,
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: active
                      ? "1px solid rgba(59,130,246,0.28)"
                      : "1px solid var(--border, #dbe2ea)",
                    background: active ? "rgba(59,130,246,0.08)" : "#fff",
                    color: "var(--text, #0f172a)",
                    textAlign: "left",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted, #64748b)", fontWeight: 700 }}>
                    Day {index + 1}
                  </div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>
                    {formatNiceDate(day)}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {[
              {
                label: "Present",
                value: selectedDayStats.present,
                kind: "success" as const,
              },
              {
                label: "Late",
                value: selectedDayStats.late,
                kind: "warning" as const,
              },
              {
                label: "Absent",
                value: selectedDayStats.absent,
                kind: "danger" as const,
              },
              {
                label: "Excused",
                value: selectedDayStats.excused,
                kind: "info" as const,
              },
              {
                label: "Days remaining",
                value: overallStats.remainingDays,
                kind: "neutral" as const,
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  border: "1px solid var(--border, #dbe2ea)",
                  borderRadius: 18,
                  background: "#fff",
                  padding: 16,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, color: "var(--muted, #64748b)", fontWeight: 700 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 30, fontWeight: 900 }}>{card.value}</div>
                <span style={badgeStyle(card.kind)}>Selected day</span>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                minWidth: 980,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Employee",
                    "Role",
                    "Selected day",
                    "Set attendance",
                    "Progress",
                    "Evaluation",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        textAlign: "left",
                        padding: "14px 12px",
                        fontSize: 12,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--muted, #64748b)",
                        borderBottom: "1px solid var(--border, #dbe2ea)",
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {participants.map((row) => {
                  const selectedStatus =
                    attendanceByParticipant[row.id]?.[selectedDay] || "ABSENT";

                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                          fontWeight: 800,
                        }}
                      >
                        {row.name}
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                          color: "var(--muted, #64748b)",
                        }}
                      >
                        {row.role}
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                        }}
                      >
                        <span style={getAttendanceBadge(selectedStatus)}>
                          {selectedStatus}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                        }}
                      >
                        <select
                          value={selectedStatus}
                          onChange={(e) =>
                            updateAttendance(
                              row.id,
                              selectedDay,
                              e.target.value as DailyAttendanceStatus
                            )
                          }
                          style={{
                            border: "1px solid var(--border, #dbe2ea)",
                            borderRadius: 12,
                            padding: "10px 12px",
                            background: "#fff",
                          }}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="LATE">Late</option>
                          <option value="ABSENT">Absent</option>
                          <option value="EXCUSED">Excused</option>
                        </select>
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                          minWidth: 160,
                        }}
                      >
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontWeight: 800 }}>{row.progress}%</div>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 999,
                              background: "rgba(15,23,42,0.08)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${row.progress}%`,
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, #6366f1 0%, #10b981 100%)",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                        }}
                      >
                        <span style={getEvaluationBadge(row.evaluationStatus)}>
                          {row.evaluationStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 700 }}>
                Note for {formatNiceDate(selectedDay)}
              </span>
              <textarea
                value={dayNote}
                onChange={(e) => setDayNote(e.target.value)}
                rows={4}
                placeholder="Write what happened during this day..."
                style={{
                  border: "1px solid var(--border, #dbe2ea)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  resize: "vertical",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <button
              type="button"
              className="btn btn-primary"
              onClick={saveDayAttendance}
              style={{ height: "fit-content" }}
            >
              <FiCheckCircle />
              Save day
            </button>
          </div>
        </section>

        <section
          style={{
            ...cardStyle(),
            padding: 22,
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Attendance history</div>
              <div style={{ color: "var(--muted, #64748b)", marginTop: 6 }}>
                Review all activity days for every employee before final evaluation.
              </div>
            </div>

            <span style={badgeStyle("success")}>
              {overallStats.confirmed}/{mockActivity.seats} active
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                minWidth: 1100,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 12px",
                      fontSize: 12,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--muted, #64748b)",
                      borderBottom: "1px solid var(--border, #dbe2ea)",
                    }}
                  >
                    Employee
                  </th>
                  {activityDays.map((day, idx) => (
                    <th
                      key={day}
                      style={{
                        textAlign: "left",
                        padding: "14px 12px",
                        fontSize: 12,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--muted, #64748b)",
                        borderBottom: "1px solid var(--border, #dbe2ea)",
                        minWidth: 120,
                      }}
                    >
                      D{idx + 1}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 12px",
                      fontSize: 12,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--muted, #64748b)",
                      borderBottom: "1px solid var(--border, #dbe2ea)",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {participants.map((row) => {
                  const isSelected = selectedParticipantId === row.id;

                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.04)" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                          fontWeight: 800,
                        }}
                      >
                        {row.name}
                      </td>

                      {activityDays.map((day) => {
                        const status =
                          attendanceByParticipant[row.id]?.[day] || "ABSENT";

                        return (
                          <td
                            key={day}
                            style={{
                              padding: "16px 12px",
                              borderBottom: "1px solid var(--border, #eef2f7)",
                            }}
                          >
                            <span style={getAttendanceBadge(status)}>{status}</span>
                          </td>
                        );
                      })}

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: "1px solid var(--border, #eef2f7)",
                        }}
                      >
                        <button
                          type="button"
                          className={
                            isSelected
                              ? "btn btn-primary btn-small"
                              : "btn btn-ghost btn-small"
                          }
                          onClick={() => setSelectedParticipantId(row.id)}
                        >
                          {isSelected ? "Selected" : "Evaluate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 20,
          }}
        >
          <div
            style={{
              ...cardStyle(),
              padding: 22,
              display: "grid",
              gap: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Employee evaluation</div>
              <div style={{ color: "var(--muted, #64748b)", marginTop: 6 }}>
                Use the full attendance history before submitting the final employee evaluation.
              </div>
            </div>

            {selectedParticipant ? (
              <>
                <div
                  style={{
                    border: "1px solid var(--border, #dbe2ea)",
                    borderRadius: 20,
                    padding: 16,
                    background: "var(--surface, #fff)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>
                        {selectedParticipant.name}
                      </div>
                      <div style={{ color: "var(--muted, #64748b)", marginTop: 4 }}>
                        {selectedParticipant.role}
                      </div>
                    </div>
                    <div style={badgeStyle("info")}>
                      Recommendation score: {selectedParticipant.score}/100
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 14,
                  }}
                >
                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>Attendance</span>
                    <select
                      value={selectedEvaluation.attendanceStatus}
                      onChange={(e) =>
                        updateSelectedEvaluation(
                          "attendanceStatus",
                          e.target.value as AttendanceStatus
                        )
                      }
                      style={{
                        border: "1px solid var(--border, #dbe2ea)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "#fff",
                      }}
                    >
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="IRREGULAR">Irregular</option>
                      <option value="POOR">Poor</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>Participation</span>
                    <select
                      value={selectedEvaluation.participationLevel}
                      onChange={(e) =>
                        updateSelectedEvaluation(
                          "participationLevel",
                          e.target.value as ParticipationLevel
                        )
                      }
                      style={{
                        border: "1px solid var(--border, #dbe2ea)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "#fff",
                      }}
                    >
                      <option value="VERY_ACTIVE">Very active</option>
                      <option value="ACTIVE">Active</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="LOW">Low</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>Skill progress</span>
                    <select
                      value={selectedEvaluation.skillProgress}
                      onChange={(e) =>
                        updateSelectedEvaluation(
                          "skillProgress",
                          e.target.value as SkillProgress
                        )
                      }
                      style={{
                        border: "1px solid var(--border, #dbe2ea)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "#fff",
                      }}
                    >
                      <option value="STRONG">Strong improvement</option>
                      <option value="MODERATE">Moderate improvement</option>
                      <option value="SLIGHT">Slight improvement</option>
                      <option value="NONE">No visible improvement</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>Outcome</span>
                    <select
                      value={selectedEvaluation.outcome}
                      onChange={(e) =>
                        updateSelectedEvaluation(
                          "outcome",
                          e.target.value as EvaluationOutcome
                        )
                      }
                      style={{
                        border: "1px solid var(--border, #dbe2ea)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "#fff",
                      }}
                    >
                      <option value="COMPLETED_SUCCESSFULLY">
                        Completed successfully
                      </option>
                      <option value="NEEDS_FOLLOW_UP">Needs follow-up</option>
                      <option value="DID_NOT_COMPLETE">Did not complete</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>Recommendation</span>
                    <select
                      value={selectedEvaluation.recommendation}
                      onChange={(e) =>
                        updateSelectedEvaluation(
                          "recommendation",
                          e.target.value as Recommendation
                        )
                      }
                      style={{
                        border: "1px solid var(--border, #dbe2ea)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "#fff",
                      }}
                    >
                      <option value="ADVANCED_TRAINING">Advanced training</option>
                      <option value="PROJECT_ASSIGNMENT">Project assignment</option>
                      <option value="MENTORING">Mentoring</option>
                      <option value="RETRY_LATER">Retry later</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>Manager rating</span>
                    <select
                      value={selectedEvaluation.rating}
                      onChange={(e) =>
                        updateSelectedEvaluation("rating", Number(e.target.value))
                      }
                      style={{
                        border: "1px solid var(--border, #dbe2ea)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: "#fff",
                      }}
                    >
                      <option value={1}>1 / 5</option>
                      <option value={2}>2 / 5</option>
                      <option value={3}>3 / 5</option>
                      <option value={4}>4 / 5</option>
                      <option value={5}>5 / 5</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>Manager comment</span>
                  <textarea
                    value={selectedEvaluation.comment}
                    onChange={(e) =>
                      updateSelectedEvaluation("comment", e.target.value)
                    }
                    rows={6}
                    placeholder="Write your evaluation note here..."
                    style={{
                      border: "1px solid var(--border, #dbe2ea)",
                      borderRadius: 16,
                      padding: "14px 16px",
                      resize: "vertical",
                      background: "#fff",
                      fontFamily: "inherit",
                    }}
                  />
                </label>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={saveEvaluationDraft}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={submitEvaluation}
                  >
                    <FiCheckCircle />
                    Submit evaluation
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--muted, #64748b)" }}>
                No participant selected.
              </div>
            )}
          </div>

          <div
            style={{
              ...cardStyle(),
              padding: 22,
              display: "grid",
              gap: 18,
              alignContent: "start",
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Final report to HR</div>
              <div style={{ color: "var(--muted, #64748b)", marginTop: 6 }}>
                Summarize the activity outcome and send the report once manager evaluations are ready.
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                padding: 16,
                background: "rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.18)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 800 }}>Quick summary</div>
              <div style={{ color: "var(--muted, #64748b)", lineHeight: 1.6 }}>
                <div>Confirmed participants: {overallStats.confirmed}</div>
                <div>Pending evaluations: {overallStats.pending}</div>
                <div>Submitted evaluations: {overallStats.submitted}</div>
                <div>Selected day: {formatNiceDate(selectedDay)}</div>
              </div>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Manager final note</span>
              <textarea
                value={finalReport}
                onChange={(e) => setFinalReport(e.target.value)}
                rows={10}
                placeholder="Write the summary that HR will receive..."
                style={{
                  border: "1px solid var(--border, #dbe2ea)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  resize: "vertical",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sendFinalReportToHr}
              >
                <FiSend />
                Send final report to HR
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => alert("Export report coming next.")}
              >
                <FiFileText />
                Export report
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}