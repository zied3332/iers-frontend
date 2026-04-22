import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFinalizedActivitiesForEvaluation,
  type ActivityEvalProgress,
} from "../../services/post-activity-evaluations.service";

type Role = "MANAGER" | "HR" | "SUPER_MANAGER" | "EMPLOYEE" | null;

function getRole(): Role {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed?.role as Role) || null;
  } catch {
    return null;
  }
}

function targetPrefix(role: Role): string {
  if (role === "HR") return "/hr";
  if (role === "SUPER_MANAGER") return "/super-manager";
  return "/manager";
}

export default function PostActivityFinalizedPage() {
  const navigate = useNavigate();
  const role = getRole();
  const prefix = targetPrefix(role);

  const [items, setItems] = useState<ActivityEvalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await getFinalizedActivitiesForEvaluation();
        if (!cancelled) setItems(Array.isArray(rows) ? rows : []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load finalized evaluations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) =>
      String(b.activity?.managerEvaluationFinalizedAt || "").localeCompare(
        String(a.activity?.managerEvaluationFinalizedAt || "")
      )
    );
    return copy;
  }, [items]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--muted)" }}>Loading finalized evaluations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            Finalized post-activity evaluations
          </h1>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Activities finalized by managers. Open one to view evaluation details in read-only mode.
          </p>
        </div>

        {error ? (
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid #fecaca", color: "#b91c1c", background: "rgba(239,68,68,0.08)", marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        {sorted.length === 0 ? (
          <div style={{ padding: 30, borderRadius: 14, border: "1px dashed var(--border)", color: "var(--muted)", textAlign: "center" }}>
            No finalized evaluations yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {sorted.map((item) => (
              <button
                key={item.activity._id}
                type="button"
                onClick={() => navigate(`${prefix}/activities/${item.activity._id}/evaluate`)}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{item.activity.title}</div>
                    <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
                      {item.activity.type} · {item.reviewedCount}/{item.totalParticipants} evaluated
                    </div>
                  </div>
                  <span className="badge">Finalized</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
