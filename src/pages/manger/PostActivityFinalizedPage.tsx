import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiTrash2 } from "react-icons/fi";
import {
  getFinalizedActivitiesForEvaluation,
  type ActivityEvalProgress,
} from "../../services/post-activity-evaluations.service";
import { deleteActivityById } from "../../services/activities.service";

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
  const [search, setSearch] = useState("");
  const [createdSortOrder, setCreatedSortOrder] = useState<"newest" | "oldest">("newest");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "TRAINING" | "CERTIFICATION" | "PROJECT" | "MISSION" | "AUDIT"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const ITEMS_PER_PAGE = 8;

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

  const filteredSorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aTs = Date.parse(
        String(
          (a.activity as any)?.createdAt ||
            a.activity?.managerEvaluationFinalizedAt ||
            a.activity?.startDate ||
            ""
        )
      );
      const bTs = Date.parse(
        String(
          (b.activity as any)?.createdAt ||
            b.activity?.managerEvaluationFinalizedAt ||
            b.activity?.startDate ||
            ""
        )
      );
      const safeA = Number.isNaN(aTs) ? 0 : aTs;
      const safeB = Number.isNaN(bTs) ? 0 : bTs;
      return createdSortOrder === "oldest" ? safeA - safeB : safeB - safeA;
    });
    const q = search.trim().toLowerCase();
    return copy.filter((item) => {
      if (
        typeFilter !== "all" &&
        String(item.activity?.type || "").toUpperCase() !== typeFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        item.activity?.title || "",
        item.activity?.type || "",
        item.activity?.status || "",
        String(item.reviewedCount),
        String(item.totalParticipants),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, typeFilter, createdSortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, items.length]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSorted, safePage]);
  const startItem =
    filteredSorted.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredSorted.length);

  const onConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    setError("");
    try {
      await deleteActivityById(deleteConfirmId);
      setItems((prev) => prev.filter((item) => item.activity._id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete activity.");
    } finally {
      setDeleting(false);
    }
  };

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
          <p
            className="page-subtitle"
            style={{
              marginTop: 8,
              color: "color-mix(in srgb, var(--text) 72%, var(--muted))",
            }}
          >
            Activities finalized by managers. Open one to view evaluation details in read-only mode.
          </p>
        </div>

        {error ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid color-mix(in srgb, var(--border) 66%, #ef4444)",
              color: "color-mix(in srgb, var(--text) 78%, #b91c1c)",
              background: "color-mix(in srgb, var(--surface) 92%, #ef4444)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "10px 12px",
              background: "var(--card)",
            }}
          >
            <FiSearch size={16} style={{ color: "var(--muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search finalized activities..."
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text)",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as
                    | "all"
                    | "TRAINING"
                    | "CERTIFICATION"
                    | "PROJECT"
                    | "MISSION"
                    | "AUDIT"
                )
              }
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 12px",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 600,
              }}
            >
              <option value="all">All activity types</option>
              <option value="TRAINING">Training</option>
              <option value="CERTIFICATION">Certification</option>
              <option value="PROJECT">Project</option>
              <option value="MISSION">Mission</option>
              <option value="AUDIT">Audit</option>
            </select>

            <select
              value={createdSortOrder}
              onChange={(e) => setCreatedSortOrder(e.target.value as "newest" | "oldest")}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 12px",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 600,
              }}
            >
              <option value="newest"> newest first</option>
              <option value="oldest">oldest first</option>
            </select>
          </div>
        </div>

        {filteredSorted.length === 0 ? (
          <div style={{ padding: 30, borderRadius: 14, border: "1px dashed var(--border)", color: "var(--muted)", textAlign: "center" }}>
            No finalized evaluations yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {paginated.map((item) => (
              <div
                key={item.activity._id}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`${prefix}/activities/${item.activity._id}/evaluated`)}
                    style={{
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      color: "var(--text)",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{item.activity.title}</div>
                    <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
                      {item.activity.type} · {item.reviewedCount}/{item.totalParticipants} evaluated
                    </div>
                  </button>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="badge">Finalized</span>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.activity._id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid color-mix(in srgb, var(--border) 72%, #ef4444)",
                        background: "color-mix(in srgb, var(--surface) 90%, #ef4444)",
                        color: "var(--text)",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <FiTrash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  color: "color-mix(in srgb, var(--text) 70%, var(--muted))",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                Showing {startItem} to {endItem} of {filteredSorted.length}
              </span>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={
                        pageNumber === safePage
                          ? "btn btn-primary btn-small"
                          : "btn btn-ghost btn-small"
                      }
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={safePage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {deleteConfirmId ? (
        <div
          onClick={() => !deleting && setDeleteConfirmId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px, 96vw)",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              borderLeft: "4px solid #ef4444",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--text)", marginBottom: "12px" }}>
              Delete evaluated activity?
            </div>
            <div style={{ color: "var(--muted)", marginBottom: "20px", lineHeight: 1.5 }}>
              This will permanently remove this evaluated activity.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="btn btn-ghost btn-small"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDelete()}
                disabled={deleting}
                className="btn btn-primary btn-small"
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
              >
                {deleting ? "Deleting..." : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
