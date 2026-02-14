import { NavLink } from "react-router-dom";

const item = ({ isActive }: any) => ({
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 800,
  color: isActive ? "white" : "#0f172a",
  background: isActive ? "#1f7a5a" : "transparent",
});

export default function TopNav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #eaecef",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>IntelliHR</div>

          <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <NavLink to="/hr/dashboard" style={item}>HR Dashboard</NavLink>
            <NavLink to="/hr/employees" style={item}>HR Employees</NavLink>
            <NavLink to="/manager/dashboard" style={item}>Manager</NavLink>
            <NavLink to="/me/profile" style={item}>My Profile</NavLink>
          </nav>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            placeholder="Search…"
            style={{
              width: 220,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #eaecef",
              outline: "none",
            }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "#0f172a",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
            title="Admin"
          >
            A
          </div>
        </div>
      </div>
    </header>
  );
}