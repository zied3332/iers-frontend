import React from "react";
import { Navigate, Outlet } from "react-router-dom";

type Role = "HR" | "MANAGER" | "EMPLOYEE";

function getStoredUser(): { role?: Role } | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function RequireRole({ allow }: { allow: Role[] }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth/login" replace />;

  const user = getStoredUser();
  const role = user?.role;

  // If token exists but user missing -> go login (or you can refetch /auth/profile)
  if (!role) return <Navigate to="/auth/login" replace />;

  if (!allow.includes(role)) return <Navigate to="/403" replace />;

  return <Outlet />;
}