import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, type CurrentUser } from "../../services/auth.service";
import { getEmployeeByUserId, patchEmployeeById } from "../../services/employee.service";
import { patchMe } from "../profile/profile.api";

type SeniorityLevel = "JUNIOR" | "MID" | "SENIOR";

type EditFormState = {
  name: string;
  email: string;
  matricule: string;
  telephone: string;
  date_embauche: string;
  jobTitle: string;
  experienceYears: number;
  seniorityLevel: SeniorityLevel;
};

function roleBaseFromPath(pathname: string): "hr" | "super-manager" | "manager" | "me" {
  const first = String(pathname.split("/")[1] || "").toLowerCase();
  if (first === "hr") return "hr";
  if (first === "super-manager") return "super-manager";
  if (first === "manager") return "manager";
  return "me";
}

function toInputDate(raw?: string): string {
  if (!raw) return "";
  const normalized = String(raw).trim();
  if (!normalized) return "";
  return normalized.includes("T") ? normalized.split("T")[0] : normalized;
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const roleBase = useMemo(() => roleBaseFromPath(location.pathname), [location.pathname]);
  const settingsPath = `/${roleBase}/settings`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [employeeRecordId, setEmployeeRecordId] = useState("");

  const [form, setForm] = useState<EditFormState>({
    name: "",
    email: "",
    matricule: "",
    telephone: "",
    date_embauche: "",
    jobTitle: "",
    experienceYears: 0,
    seniorityLevel: "JUNIOR",
  });

  const isEmployee = String(currentUser?.role || "").toUpperCase() === "EMPLOYEE";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const me = await getCurrentUser();
        if (!active) return;

        setCurrentUser(me);
        setForm({
          name: String(me.name || ""),
          email: String(me.email || ""),
          matricule: String(me.matricule || ""),
          telephone: String(me.telephone || ""),
          date_embauche: toInputDate(me.date_embauche),
          jobTitle: "",
          experienceYears: 0,
          seniorityLevel: "JUNIOR",
        });

        if (String(me.role || "").toUpperCase() === "EMPLOYEE") {
          try {
            const employee = await getEmployeeByUserId(me._id);
            if (!active || !employee) return;
            setEmployeeRecordId(String(employee._id || ""));
            setForm((prev) => ({
              ...prev,
              jobTitle: String(employee.jobTitle || ""),
              experienceYears: Number(employee.experienceYears || 0),
              seniorityLevel: (employee.seniorityLevel || "JUNIOR") as SeniorityLevel,
            }));
          } catch {
            // keep page usable if employee record lookup fails
          }
        }
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load user data.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const onSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        matricule: form.matricule.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        date_embauche: form.date_embauche || undefined,
      };

      await patchMe(payload);

      if (isEmployee && employeeRecordId) {
        await patchEmployeeById(employeeRecordId, {
          jobTitle: form.jobTitle.trim() || "Not Assigned",
          experienceYears: Math.max(0, Number(form.experienceYears || 0)),
          seniorityLevel: form.seniorityLevel,
        });
      }

      const mergedUser = {
        ...(currentUser as any),
        name: form.name.trim() || currentUser.name,
        email: form.email.trim() || currentUser.email,
        matricule: form.matricule.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        date_embauche: form.date_embauche || undefined,
      };
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setCurrentUser(mergedUser);
      setSuccess("Profile data updated successfully.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 16 }}>
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Edit profile</h1>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Update your personal and professional details from this dedicated page.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate(settingsPath)}>
            Back to settings
          </button>
        </div>

        {error ? (
          <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </div>
        ) : null}
        {success ? (
          <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--primary-border)", background: "var(--primary-weak)", color: "var(--primary-soft-text)", fontWeight: 700 }}>
            {success}
          </div>
        ) : null}

        <section className="card section-card" style={{ padding: 20 }}>
          {loading ? (
            <p className="muted" style={{ margin: 0 }}>Loading profile fields...</p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 8 }}>
                  <span className="section-title" style={{ fontSize: 14 }}>Full name</span>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span className="section-title" style={{ fontSize: 14 }}>Email</span>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@company.com"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span className="section-title" style={{ fontSize: 14 }}>Matricule</span>
                  <input
                    className="input"
                    value={form.matricule}
                    onChange={(e) => setForm((prev) => ({ ...prev, matricule: e.target.value }))}
                    placeholder="EMP-0001"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span className="section-title" style={{ fontSize: 14 }}>Phone</span>
                  <input
                    className="input"
                    value={form.telephone}
                    onChange={(e) => setForm((prev) => ({ ...prev, telephone: e.target.value }))}
                    placeholder="+216..."
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span className="section-title" style={{ fontSize: 14 }}>Hire date</span>
                  <input
                    className="input"
                    type="date"
                    value={form.date_embauche}
                    onChange={(e) => setForm((prev) => ({ ...prev, date_embauche: e.target.value }))}
                  />
                </label>

                {isEmployee ? (
                  <>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span className="section-title" style={{ fontSize: 14 }}>Job title</span>
                      <input
                        className="input"
                        value={form.jobTitle}
                        onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                        placeholder="Software Engineer"
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                      <span className="section-title" style={{ fontSize: 14 }}>Experience years</span>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={form.experienceYears}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, experienceYears: Math.max(0, Number(e.target.value || 0)) }))
                        }
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                      <span className="section-title" style={{ fontSize: 14 }}>Seniority level</span>
                      <select
                        className="select"
                        value={form.seniorityLevel}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, seniorityLevel: e.target.value as SeniorityLevel }))
                        }
                      >
                        <option value="JUNIOR">JUNIOR</option>
                        <option value="MID">MID</option>
                        <option value="SENIOR">SENIOR</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={() => void onSave()} disabled={saving || loading}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button className="btn btn-ghost" onClick={() => navigate(settingsPath)} disabled={saving}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
