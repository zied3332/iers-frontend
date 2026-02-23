// src/router/router.tsx
import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import AuthLayout from "../pages/auth/AuthLayout";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import HrLayout from "../layouts/HrLayout";
import ManagerLayout from "../layouts/ManagerLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";

// HR pages
import HrDashboard from "../pages/hr/Dashboard";
import HrEmployees from "../pages/hr/Employees";
import HrEmployeeDetails from "../pages/hr/EmployeeDetails";
import HrSkillsDashboard from "../pages/hr/HrSkillsDashboard";
import HrRecommendations from "../pages/hr/Recommendations";
import HrGenerateRecommendations from "../pages/hr/GenerateRecommendations";
import UsersManagement from "../pages/hr/UsersManagement";

// Manager pages
import ManagerTeam from "../pages/manger/ManagerTeam";

// Employee pages
import MyActivities from "../pages/employee/MyActivities";
import Recommendations from "../pages/employee/Recommendations";
import History from "../pages/employee/History";
import CvUpload from "../pages/employee/CvUpload";

import Blank from "../pages/Blank";
import Profile from "../pages/profile/Profile";

type Role = "HR" | "MANAGER" | "EMPLOYEE";

function getRole(): Role | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return (u?.role as Role) || null;
  } catch {
    return null;
  }
}

function RequireRole({ allow }: { allow: Role[] }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth/login" replace />;

  const role = getRole();
  if (!role) return <Navigate to="/auth/login" replace />;

  if (!allow.includes(role)) return <Navigate to="/403" replace />;

  return <Outlet />;
}

function Forbidden() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>403 - Access denied</h1>
      <p style={{ marginBottom: 16 }}>
        You are logged in, but you don’t have permission to access this page.
      </p>
      <a href="/" className="btn btn-primary">
        Go to home
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/auth/login" replace /> },
  { path: "/403", element: <Forbidden /> },

  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Login /> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
    ],
  },

  // ✅ HR protected routes (unchanged)
 {
  element: <RequireRole allow={["HR"]} />,
  children: [
    {
      path: "/hr",
      element: <HrLayout />,
      children: [
        // ✅ default: show blank (keeps sidebar but empty page)
        { index: true, element: <Blank /> },

        // ✅ explicit blank route used by sidebar links
        { path: "blank", element: <Blank /> },

        // ✅ block these pages (even if URL typed)
        { path: "dashboard", element: <Blank /> },
        { path: "employees", element: <Blank /> },
        { path: "employees/:id", element: <Blank /> },
        { path: "skills-dashboard", element: <Blank /> },
        { path: "recommendations", element: <Blank /> },
        { path: "recommendations/generate", element: <Blank /> },

        // ✅ keep working
        { path: "users", element: <UsersManagement /> },

        // (optional) keep profile working, or change to <Blank /> if you want it blocked too
        { path: "profile", element: <Profile /> },
      ],
    },
  ],
},

  // ✅ MANAGER protected routes (FIXED)
  {
    element: <RequireRole allow={["MANAGER"]} />,
    children: [
      {
        path: "/manager",
        element: <ManagerLayout />,
        children: [
          // ✅ default blank
          { index: true, element: <Blank /> },

          // ✅ optional blank route
          { path: "blank", element: <Blank /> },

          // ✅ block these pages
          { path: "dashboard", element: <Blank /> },
          { path: "approvals", element: <Blank /> },
          { path: "analytics", element: <Blank /> },

          // ✅ keep working
          { path: "team", element: <ManagerTeam /> },

          // keep profile working (or change to <Blank />)
          { path: "profile", element: <Profile /> },
        ],
      },
    ],
  },

  // ✅ EMPLOYEE protected routes (FIXED)
  {
    element: <RequireRole allow={["EMPLOYEE"]} />,
    children: [
      {
        path: "/me",
        element: <EmployeeLayout />,
        children: [
          // ✅ ONLY ONE index route
          { index: true, element: <Blank /> },

          { path: "blank", element: <Blank /> },

          { path: "profile", element: <Profile /> },
          { path: "activities", element: <MyActivities /> },
          { path: "recommendations", element: <Recommendations /> },
          { path: "history", element: <History /> },
          { path: "cv", element: <CvUpload /> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);