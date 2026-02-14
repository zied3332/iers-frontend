import { NavLink, Outlet } from "react-router-dom";
import TopNav from "../components/TopNav";

const linkStyle = ({ isActive }: any) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 800,
  background: isActive ? "rgba(31, 122, 90, 0.12)" : "transparent",
  color: isActive ? "#1f7a5a" : "#0f172a",
});

export default function HrLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: "white",
          borderRight: "1px solid #eaecef",
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>IntelliHR</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <NavLink to="/hr/dashboard" style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/hr/employees" style={linkStyle}>
            Employees
          </NavLink>
           <NavLink to="/hr/skills-dashboard" style={linkStyle}>
            Skills
          </NavLink>
          <NavLink to="/hr/Recommendations" style={linkStyle}>
            Recommendations
          </NavLink>
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, background: "#f8fafc", overflow: "auto" }}>
        <TopNav />
        <div style={{ padding: 20 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}