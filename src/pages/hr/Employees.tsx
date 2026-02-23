import { Link } from "react-router-dom";
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #eaecef",
  borderRadius: 18,
  padding: 16,
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

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  background: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGreen: React.CSSProperties = {
  ...btn,
  border: "none",
  background: "#1f7a5a",
  color: "white",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  outline: "none",
  fontWeight: 700,
};

const select: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  background: "white",
  fontWeight: 800,
  outline: "none",
};

type Emp = {
  id: string;
  name: string;
  role: string;
  department: string;
  globalScore: number;
  risk: "Low" | "Medium" | "High";
};

export default function HrEmployees() {
  const employees: Emp[] = [
    { id: "1", name: "Adam Taylor", role: "Software Engineer", department: "Engineering", globalScore: 78, risk: "Medium" },
    { id: "2", name: "Charles Johnson", role: "DevOps Specialist", department: "IT Support", globalScore: 64, risk: "High" },
    { id: "3", name: "Luke Evans", role: "Cloud Architect", department: "Engineering", globalScore: 81, risk: "Low" },
    { id: "4", name: "Emma White", role: "Infrastructure Analyst", department: "IT Support", globalScore: 70, risk: "Medium" },
    { id: "5", name: "Sara Anderson", role: "Java Developer", department: "Engineering", globalScore: 86, risk: "Low" },
  ];

  return (
    <div className="page">
          <div className="container">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 44, margin: 0 }}>Employees</h1>
          <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
            Browse employees, filter by department/skills, and take actions.
          </div>
        </div>

        <button style={btnGreen}>+ Add Employee</button>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 10 }}>
          <input style={input} placeholder="Search name / role..." />

          <select style={select} defaultValue="all">
            <option value="all">Department: All</option>
            <option value="Engineering">Engineering</option>
            <option value="IT Support">IT Support</option>
            <option value="Marketing">Marketing</option>
          </select>

          <select style={select} defaultValue="all">
            <option value="all">Skill: Any</option>
            <option value="SQL">SQL</option>
            <option value="Kubernetes">Kubernetes</option>
            <option value="AWS">AWS</option>
            <option value="Communication">Communication</option>
          </select>

          <select style={select} defaultValue="all">
            <option value="all">Risk: Any</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, marginTop: 14, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 16, fontWeight: 900 }}>All Employees</div>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 14, color: "#64748b" }}>Employee</th>
                <th style={{ padding: 14, color: "#64748b" }}>Role</th>
                <th style={{ padding: 14, color: "#64748b" }}>Department</th>
                <th style={{ padding: 14, color: "#64748b" }}>Global Score</th>
                <th style={{ padding: 14, color: "#64748b" }}>Risk</th>
                <th style={{ padding: 14, color: "#64748b" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td style={{ padding: 14, fontWeight: 900 }}>{e.name}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.role}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.department}</td>

                  <td style={{ padding: 14 }}>
                    <div style={{ fontWeight: 900 }}>{e.globalScore}</div>
                    <div style={{ height: 10, background: "#eef2f7", borderRadius: 999, marginTop: 6 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${e.globalScore}%`,
                          background: "#1f7a5a",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </td>

                  <td style={{ padding: 14 }}>
                    {e.risk === "High" && <span style={badge("#fee2e2", "#991b1b")}>High</span>}
                    {e.risk === "Medium" && <span style={badge("#ffedd5", "#9a3412")}>Medium</span>}
                    {e.risk === "Low" && <span style={badge("rgba(31,122,90,0.12)", "#1f7a5a")}>Low</span>}
                  </td>

                  <td style={{ padding: 14 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
<Link to={`/hr/employees/${e.id}`} style={{ textDecoration: "none" }}>
  <button style={btn}>View</button>
</Link>                      <button style={btnGreen}>Invite</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", color: "#64748b", fontWeight: 700 }}>
          <div>Showing {employees.length} employees</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn}>Prev</button>
            <button style={btn}>Next</button>
          </div>
        </div>
      </div>
         </div>
    </div>
  );
}