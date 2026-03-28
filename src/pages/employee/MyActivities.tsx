import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listActivities,
  getActivitySkills,
  enrollInActivity,
  type ActivityRecord,
  type ActivitySkillRecord,
} from "../../services/activities.service";
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #eaecef",
  borderRadius: 12,
  padding: 16,
};

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #eaecef",
  background: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const btnGreen: React.CSSProperties = {
  ...btn,
  border: "none",
  background: "#1f7a5a",
  color: "white",
};

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: bg,
  color,
  fontWeight: 900,
  fontSize: 12,
});

const contextColors: Record<string, [string, string]> = {
  UPSKILLING: ["#e0f2fe", "#0369a1"],
  EXPERTISE: ["#fef3c7", "#f59e0b"],
  DEVELOPMENT: ["#f3e8ff", "#7c3aed"],
};

function formatLevel(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export default function MyActivities() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState("");

  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [activitySkills, setActivitySkills] = useState<ActivitySkillRecord[]>([]);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const activitiesRes = await listActivities();
        setActivities(activitiesRes || []);
      } catch (e: unknown) {
        console.error("Failed to load activities:", e);
        setError(e instanceof Error ? e.message : "Failed to load activities.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const myDepartmentId = useMemo(() => {
    return String(currentUser?.department || "");
  }, [currentUser]);

  const departmentActivities = useMemo(() => {
    // Employees should only see PLANNED activities assigned to their own department.
    if (!myDepartmentId) return [];
    return activities.filter(
      (a) => !!a.departmentId && String(a.departmentId) === myDepartmentId && a.status === "PLANNED"
    );
  }, [activities, myDepartmentId]);

  const openActivityDetails = useCallback(async (activity: ActivityRecord) => {
    setSelectedActivity(activity);
    try {
      const skills = await getActivitySkills(activity._id);
      setActivitySkills(skills);
    } catch (e: unknown) {
      console.error("Failed to load skills:", e);
      setActivitySkills([]);
    }
  }, []);

  const closeActivityDetails = useCallback(() => {
    setSelectedActivity(null);
    setActivitySkills([]);
    const params = new URLSearchParams(location.search);
    if (params.has("activityId")) {
      navigate("/me/activities", { replace: true });
    }
  }, [location.search, navigate]);

  const currentEmployeeId = useMemo(() => {
    return (
      String(currentUser?.employeeId || "") ||
      String(currentUser?._id || "") ||
      String(currentUser?.id || "")
    );
  }, [currentUser]);

  const handleEnroll = async (activityId: string) => {
    if (enrolling === activityId) return;
    setEnrolling(activityId);
    setError("");
    setEnrollSuccess("");
    try {
      const response = await enrollInActivity(activityId, currentEmployeeId || undefined);
      const apiMessage = String(
        response?.message || response?.statusMessage || ""
      ).trim();

      setEnrollSuccess(apiMessage || "Enrollment request submitted successfully.");
      setTimeout(() => setEnrollSuccess(""), 3000);
    } catch (e: unknown) {
      console.error("Enrollment failed:", e);
      setError(e instanceof Error ? e.message : "Failed to enroll in activity.");
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => {
    if (!activities.length) return;
    const params = new URLSearchParams(location.search);
    const requestedActivityId = params.get("activityId");
    if (!requestedActivityId) return;
    if (selectedActivity?._id === requestedActivityId) return;

    const targetActivity = activities.find((activity) => activity._id === requestedActivityId);
    if (!targetActivity) {
      setError("L'activité demandée est introuvable.");
      return;
    }

    void openActivityDetails(targetActivity);
  }, [activities, location.search, openActivityDetails, selectedActivity?._id]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 40 }}>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ marginBottom: 0 }}>Available Activities</h1>
          <p style={{ color: "#6b7280", marginTop: 4 }}>
            Browse and enroll in department activities to develop your skills
          </p>
        </div>

        {error && (
          <div style={{ ...card, background: "#fee2e2", borderColor: "#fca5a5", marginBottom: 16, color: "#991b1b" }}>
            {error}
          </div>
        )}

        {enrollSuccess && (
          <div style={{ ...card, background: "#dcfce7", borderColor: "#86efac", marginBottom: 16, color: "#166534" }}>
            {enrollSuccess}
          </div>
        )}

        {departmentActivities.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: "#a3a3a3", padding: 40 }}>
            <p>No activities available yet for your department. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {departmentActivities.map((activity) => (
              <div
                key={activity._id}
                style={{
                  ...card,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                      {activity.title}
                    </div>
                    <span
                      style={badge(
                        ...(contextColors[activity.priorityContext] || contextColors.DEVELOPMENT)
                      )}
                    >
                      {activity.priorityContext}
                    </span>
                  </div>

                  <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
                    <div>{activity.description.substring(0, 100)}...</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a3a3a3", marginBottom: 2 }}>TYPE</div>
                      <div style={{ color: "#475569" }}>{activity.type}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a3a3a3", marginBottom: 2 }}>DURATION</div>
                      <div style={{ color: "#475569", fontSize: 12 }}>{activity.duration}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a3a3a3", marginBottom: 2 }}>START DATE</div>
                      <div style={{ color: "#475569", fontSize: 12 }}>
                        {new Date(activity.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a3a3a3", marginBottom: 2 }}>
                        SEATS LEFT
                      </div>
                      <div style={{ color: "#475569" }}>{activity.availableSlots}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexDirection: "column", minWidth: 150 }}>
                  <button style={{ ...btn }} onClick={() => openActivityDetails(activity)}>
                    View Details
                  </button>
                  <button
                    style={{ ...btnGreen }}
                    disabled={enrolling === activity._id}
                    onClick={() => handleEnroll(activity._id)}
                  >
                    {enrolling === activity._id ? "Enrolling..." : "Enroll Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedActivity && (
        <div
          onClick={closeActivityDetails}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.45)",
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(640px, 96vw)", maxHeight: "85vh", overflowY: "auto", ...card }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
                  {selectedActivity.title}
                </div>
                <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>
                  {selectedActivity.type}
                </div>
              </div>
              <button
                type="button"
                style={{ ...btn }}
                onClick={closeActivityDetails}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Description</div>
                <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
                  {selectedActivity.description}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Location</div>
                  <div style={{ color: "#475569" }}>{selectedActivity.location}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Duration</div>
                  <div style={{ color: "#475569" }}>{selectedActivity.duration}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Start Date</div>
                  <div style={{ color: "#475569" }}>
                    {new Date(selectedActivity.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>End Date</div>
                  <div style={{ color: "#475569" }}>
                    {new Date(selectedActivity.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Priority Level</div>
                <div style={{ color: "#475569" }}>{formatLevel(selectedActivity.targetLevel)}</div>
              </div>

              {activitySkills.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Required Skills</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {activitySkills.map((as, idx) => (
                      <div
                        key={as._id || `${as.skill_id?._id || "skill"}-${idx}`}
                        style={{
                          borderLeft: "3px solid #e0f2fe",
                          paddingLeft: 12,
                          color: "#475569",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{as.skill_id.name}</div>
                        <div style={{ fontSize: 11, color: "#a3a3a3", marginTop: 2 }}>
                          Level: <span style={{ fontWeight: 700 }}>{as.required_level}</span> | Importance:{" "}
                          <span style={{ fontWeight: 700 }}>{(as.weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button style={{ ...btn, flex: 1 }} onClick={closeActivityDetails}>
                  Close
                </button>
                <button
                  style={{ ...btnGreen, flex: 1 }}
                  disabled={enrolling === selectedActivity._id}
                  onClick={() => {
                    handleEnroll(selectedActivity._id);
                    closeActivityDetails();
                  }}
                >
                  {enrolling === selectedActivity._id ? "Enrolling..." : "Enroll Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}