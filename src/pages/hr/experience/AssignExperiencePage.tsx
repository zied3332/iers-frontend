import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getAllEmployees,
  patchEmployeeById,
  type EmployeeRecord,
} from "../../../services/employee.service";
import { getAllDepartments, type Department } from "../../../services/departments.service";
import { getAllDomains, type Domain } from "../../../services/domains.service";
import { getAllSkills } from "../../../services/skills.service";
import type { ExperienceSegmentInput } from "../../../utils/experienceSegments";
import {
  ExperienceSegmentsEditor,
  mapApiSegmentsToInput,
  mapApiSkillsToOptions,
  validateExperienceSegmentsForSave,
  type SkillOption,
} from "../../../components/ExperienceSegmentsEditor";

type EmployeeOption = {
  employeeId: string;
  name: string;
  email: string;
  departmentName: string;
  jobTitle: string;
  seniorityLevel: string;
};

function getDepartmentId(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const maybe = raw as { _id?: string; id?: string };
    return String(maybe._id || maybe.id || "");
  }
  return "";
}

function toEmployeeOptions(records: EmployeeRecord[], departments: Department[]): EmployeeOption[] {
  const depNameById = new Map(
    departments
      .map((dep) => [String(dep._id || ""), String(dep.name || "").trim()] as const)
      .filter(([id, name]) => id && name),
  );

  return records.map((record) => {
    const user = typeof record.user_id === "object" ? record.user_id : null;
    const depId = getDepartmentId(user?.departement_id);
    const embeddedDepName =
      typeof user?.departement_id === "object" && user.departement_id
        ? String(user.departement_id.name || "").trim()
        : "";
    const departmentName = embeddedDepName || depNameById.get(depId) || "No department";

    return {
      employeeId: String(record._id || ""),
      name: String(user?.name || "Unknown employee"),
      email: String(user?.email || ""),
      departmentName,
      jobTitle: String(record.jobTitle || "Not assigned"),
      seniorityLevel: String(record.seniorityLevel || "JUNIOR"),
    };
  });
}

function getInitials(name: string): string {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function AssignExperiencePage() {
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [jobTitle, setJobTitle] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState<"JUNIOR" | "MID" | "SENIOR">("JUNIOR");
  const [segments, setSegments] = useState<ExperienceSegmentInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [employeeRecords, departments, allDomains, allSkills] = await Promise.all([
          getAllEmployees(),
          getAllDepartments(),
          getAllDomains().catch(() => []),
          getAllSkills().catch(() => []),
        ]);
        setEmployees(toEmployeeOptions(employeeRecords || [], departments || []));
        setDomains(Array.isArray(allDomains) ? allDomains : []);
        setSkillOptions(mapApiSkillsToOptions(allSkills));
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const preselectedEmployeeId = String(searchParams.get("employeeId") || "").trim();
    if (!preselectedEmployeeId || employees.length === 0) return;
    if (!employees.some((employee) => employee.employeeId === preselectedEmployeeId)) return;
    setSelectedEmployeeId((prev) => (prev === preselectedEmployeeId ? prev : preselectedEmployeeId));
  }, [searchParams, employees]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setExperienceYears(0);
      setJobTitle("");
      setSeniorityLevel("JUNIOR");
      setSegments([]);
      return;
    }

    const loadEmployeeExperience = async () => {
      try {
        setLoading(true);
        setError("");
        const records = await getAllEmployees();
        const selected = (records || []).find((record) => String(record._id || "") === selectedEmployeeId);
        setExperienceYears(Math.max(0, Number(selected?.experienceYears || 0)));
        setJobTitle(String(selected?.jobTitle || ""));
        const rawSeniority = String(selected?.seniorityLevel || "JUNIOR").toUpperCase();
        setSeniorityLevel(rawSeniority === "MID" || rawSeniority === "SENIOR" ? rawSeniority : "JUNIOR");
        setSegments(mapApiSegmentsToInput(selected?.experienceSegments));
      } catch {
        setError("Failed to load employee experience.");
      } finally {
        setLoading(false);
      }
    };

    void loadEmployeeExperience();
  }, [selectedEmployeeId]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employeeId === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );
  const segmentCount = segments.length;
  const selectedSkillsCount = useMemo(
    () => segments.reduce((sum, segment) => sum + (Array.isArray(segment.skillIds) ? segment.skillIds.length : 0), 0),
    [segments],
  );
  const selectedDomainsCount = useMemo(
    () =>
      segments.reduce((sum, segment) => sum + (Array.isArray(segment.domainIds) ? segment.domainIds.length : 0), 0),
    [segments],
  );

  const canSave = !!selectedEmployeeId && !saving && !loading;

  const onSave = async () => {
    if (!selectedEmployeeId) {
      setError("Select an employee first.");
      return;
    }
    const years = Number(experienceYears);
    if (!Number.isFinite(years) || years < 0) {
      setError("Experience years must be a valid non-negative number.");
      return;
    }
    const validationError = validateExperienceSegmentsForSave(years, segments);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await patchEmployeeById(selectedEmployeeId, {
        jobTitle: jobTitle.trim() || "Not Assigned",
        seniorityLevel,
        experienceYears: years,
        experienceSegments: years > 0 ? segments : [],
      });
      setSuccess("Experience assigned successfully.");
    } catch {
      setError("Failed to save experience.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "26px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", display: "grid", gap: "16px" }}>
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: "20px",
            background: "linear-gradient(140deg, var(--card) 0%, var(--surface-2) 100%)",
            padding: "24px",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h1 className="page-title" style={{ marginBottom: "4px", fontSize: "40px", fontWeight: 900 }}>
            Assign Experience
          </h1>
          <p className="page-subtitle" style={{ marginTop: 0, fontSize: "18px", color: "var(--muted)" }}>
            Build employee history with years, domains, and skills in one beautiful workflow.
          </p>
          <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span style={statPillStyle}>
              Employees: <strong>{employees.length}</strong>
            </span>
            <span style={statPillStyle}>
              Domains: <strong>{domains.length}</strong>
            </span>
            <span style={statPillStyle}>
              Skills: <strong>{skillOptions.length}</strong>
            </span>
          </div>
        </section>

        {(error || success) && (
          <div
            style={{
              padding: "12px 14px",
              border: error ? "1px solid #fecaca" : "1px solid #bbf7d0",
              background: error ? "#fef2f2" : "#ecfdf5",
              color: error ? "#b91c1c" : "#166534",
              borderRadius: "12px",
              fontWeight: 800,
            }}
          >
            {error || success}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--card)",
              padding: "16px",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
              display: "grid",
              gap: "14px",
              position: "sticky",
              top: "16px",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: "22px", color: "var(--text)" }}>Employee Details</div>

            <div style={{ display: "grid", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.04em", color: "var(--muted)" }}>
                EMPLOYEE
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setSuccess("");
                  setError("");
                }}
                style={inputStyle}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.name} - {employee.departmentName} {employee.email ? `(${employee.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.04em", color: "var(--muted)" }}>
                EXPERIENCE YEARS
              </label>
              <input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => {
                  setExperienceYears(Math.max(0, Number(e.target.value || 0)));
                  setSuccess("");
                }}
                disabled={!selectedEmployeeId || loading || saving}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.04em", color: "var(--muted)" }}>
                JOB TITLE
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => {
                  setJobTitle(e.target.value);
                  setSuccess("");
                }}
                disabled={!selectedEmployeeId || loading || saving}
                style={inputStyle}
                placeholder="Enter job title"
              />
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.04em", color: "var(--muted)" }}>
                SENIORITY LEVEL
              </label>
              <select
                value={seniorityLevel}
                onChange={(e) => {
                  const value = String(e.target.value).toUpperCase();
                  setSeniorityLevel(value === "MID" || value === "SENIOR" ? value : "JUNIOR");
                  setSuccess("");
                }}
                disabled={!selectedEmployeeId || loading || saving}
                style={inputStyle}
              >
                <option value="JUNIOR">JUNIOR</option>
                <option value="MID">MID</option>
                <option value="SENIOR">SENIOR</option>
              </select>
            </div>

            {selectedEmployee ? (
              <div
                style={{
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  padding: "12px",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "var(--primary-weak)",
                      color: "var(--primary-soft-text)",
                      fontWeight: 900,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid var(--primary-border)",
                    }}
                  >
                    {getInitials(selectedEmployee.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: "15px", color: "var(--text)" }}>{selectedEmployee.name}</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>{selectedEmployee.departmentName}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedEmployee.email || "No email"}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>Job Title</span>
                    <span style={{ fontSize: "12px", color: "var(--text)", fontWeight: 900 }}>
                      {selectedEmployee.jobTitle || "Not assigned"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>Seniority Level</span>
                    <span
                      style={{
                        borderRadius: "999px",
                        border: "1px solid var(--primary-border)",
                        background: "var(--primary-weak)",
                        color: "var(--primary-soft-text)",
                        fontWeight: 900,
                        fontSize: "11px",
                        padding: "4px 9px",
                      }}
                    >
                      {String(selectedEmployee.seniorityLevel || "JUNIOR").replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: "14px" }}>
                Select an employee to start editing experience.
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={metaLabelStyle}>Segments</span>
                <span style={metaValueStyle}>{segmentCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={metaLabelStyle}>Linked domains</span>
                <span style={metaValueStyle}>{selectedDomainsCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={metaLabelStyle}>Linked skills</span>
                <span style={metaValueStyle}>{selectedSkillsCount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onSave()}
              disabled={!canSave}
              style={{
                height: "46px",
                borderRadius: "12px",
                border: "1px solid var(--primary)",
                background: "var(--primary)",
                color: "var(--primary-on)",
                padding: "0 16px",
                fontWeight: 900,
                cursor: canSave ? "pointer" : "not-allowed",
                opacity: canSave ? 1 : 0.65,
                fontSize: "15px",
                boxShadow: canSave ? "0 10px 18px rgba(59,130,246,0.22)" : "none",
              }}
            >
              {saving ? "Saving..." : "Save Experience"}
            </button>
          </aside>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--card)",
              padding: "16px",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
              display: "grid",
              gap: "12px",
              minHeight: "420px",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "23px", color: "var(--text)" }}>Experience Segments</div>
                <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: "14px" }}>
                  Define timeline blocks and assign related domains and skills.
                </div>
              </div>
              {loading ? (
                <div style={{ color: "var(--muted)", fontWeight: 800, fontSize: "14px" }}>Loading...</div>
              ) : null}
            </div>

            <div
              style={{
                opacity: !selectedEmployeeId ? 0.58 : 1,
                transition: "opacity 0.2s ease",
                minWidth: 0,
                width: "100%",
                overflowX: "auto",
                overflowY: "visible",
                paddingBottom: "2px",
              }}
            >
              <div style={{ minWidth: 0, width: "100%" }}>
                <ExperienceSegmentsEditor
                  experienceYears={Math.max(0, Number(experienceYears || 0))}
                  segments={segments}
                  onChange={(next) => {
                    setSegments(next);
                    setSuccess("");
                  }}
                  domains={domains}
                  skills={skillOptions}
                  disabled={!selectedEmployeeId || loading || saving}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: "44px",
  borderRadius: "12px",
  border: "1px solid var(--input-border)",
  padding: "0 12px",
  fontSize: "15px",
  background: "var(--surface)",
  color: "var(--text)",
  fontWeight: 700,
};

const statPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  padding: "6px 12px",
  fontWeight: 700,
  fontSize: "14px",
};

const metaLabelStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontWeight: 700,
  fontSize: "13px",
};

const metaValueStyle: React.CSSProperties = {
  color: "var(--text)",
  fontWeight: 900,
  fontSize: "14px",
};

