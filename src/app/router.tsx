// src/router/router.tsx
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import AuthLayout from "../pages/auth/AuthLayout";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import HrLayout from "../layouts/HrLayout";
import SuperManagerLayout from "../layouts/SuperManagerLayout";
import ManagerLayout from "../layouts/ManagerLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";

// HR pages
import HrEmployees from "../pages/hr/Employees";
import UsersManagement from "../pages/hr/UsersManagement";
import HrDepartments from "../pages/hr/Departments";
import HrActivitiesManagement from "../pages/hr/ActivitiesManagement.tsx";
import HrSkillsDashboard from "../pages/hr/HrSkillsDashboard";
import HrGenerateRecommendations from "../pages/hr/GenerateRecommendations";
import SkillsManagementPage from "../pages/hr/skills/SkillsManagementPage";
import AssignSkillPage from "../pages/hr/skills/AssignSkillPage";

// Manager pages
import ManagerTeam from "../pages/manger/ManagerTeam";
import ManagerActivities from "../pages/manger/ManagerActivities.tsx";
import ManagerApprovals from "../pages/manger/Approvals";

// Employee pages
import MyActivities from "../pages/employee/MyActivities";
import AppliedActivities from "../pages/employee/AppliedActivities";
import Recommendations from "../pages/employee/Recommendations";
import History from "../pages/employee/History";
import CvUpload from "../pages/employee/CvUpload";
import MySkillsPage from "../pages/employee/skills/MySkillsPage";

import Blank from "../pages/Blank";
import Profile from "../pages/profile/Profile";

import NotificationsPage from '../pages/notifications/NotificationsPage';
import HrDashboard from "../pages/hr/Dashboard.tsx";
import HrStatsDashboard from "../pages/hr/HrStatsDashboard";
import ActivityApplications from "../pages/hr/ActivityApplications";
import CompleteProfile from "../pages/auth/CompleteProfile";


type Role = "HR" | "SUPER_MANAGER" | "MANAGER" | "EMPLOYEE";

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

function NotificationsRedirect() {
  const role = getRole();
  if (role === "HR") return <Navigate to="/hr/notifications" replace />;
  if (role === "SUPER_MANAGER") return <Navigate to="/super-manager/notifications" replace />;
  if (role === "MANAGER") return <Navigate to="/manager/notifications" replace />;
  if (role === "EMPLOYEE") return <Navigate to="/me/notifications" replace />;
  return <Navigate to="/auth/login" replace />;
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

  // ✅ HR protected routes
  {
    element: <RequireRole allow={["HR"]} />,
    children: [
      {
        path: "/hr",
        element: <HrLayout />,
        children: [
          { index: true, element: <Blank /> },
          { path: "blank", element: <Blank /> },

          { path: "dashboard", element: <HrStatsDashboard /> },
          { path: "activities", element: <HrActivitiesManagement /> },
          { path: "activity-applications", element: <ActivityApplications /> },
          { path: "skills-dashboard", element: <HrSkillsDashboard /> },
          { path: "recommendations", element: <HrGenerateRecommendations /> },
          { path: "recommendations/generate", element: <HrGenerateRecommendations /> },

          { path: "skills", element: <SkillsManagementPage /> },
          { path: "skills/assign", element: <AssignSkillPage /> },

          { path: "profile", element: <Profile /> },
          { path: "notifications", element: <NotificationsPage /> },
        ],
      },
    ],
  },

  // ✅ SUPER MANAGER protected routes
  {
    element: <RequireRole allow={["SUPER_MANAGER"]} />,
    children: [
      {
        path: "/super-manager",
        element: <SuperManagerLayout />,
        children: [
          { index: true, element: <Blank /> },
          { path: "blank", element: <Blank /> },

          { path: "dashboard", element: <HrDashboard /> },
          { path: "employees", element: <HrEmployees /> },
          { path: "users", element: <UsersManagement /> },
          { path: "departments", element: <HrDepartments /> },
          { path: "activities", element: <HrActivitiesManagement /> },
          { path: "activity-applications", element: <ActivityApplications /> },
          { path: "skills-dashboard", element: <HrSkillsDashboard /> },
          { path: "recommendations", element: <HrGenerateRecommendations /> },
          { path: "recommendations/generate", element: <HrGenerateRecommendations /> },
          { path: "skills", element: <SkillsManagementPage /> },
          { path: "skills/assign", element: <AssignSkillPage /> },
          { path: "profile", element: <Profile /> },
          { path: "notifications", element: <NotificationsPage /> },
        ],
      },
    ],
  },

  // ✅ MANAGER protected routes
  {
    element: <RequireRole allow={["MANAGER"]} />,
    children: [
      {
        path: "/manager",
        element: <ManagerLayout />,
        children: [
          { index: true, element: <Blank /> },
          { path: "blank", element: <Blank /> },

          { path: "dashboard", element: <Blank /> },
          { path: "approvals", element: <ManagerApprovals /> },
          { path: "analytics", element: <Blank /> },

          { path: "team", element: <ManagerTeam /> },
          { path: "profile", element: <Profile /> },
            { path: "activities", element: <ManagerActivities /> },
          { path: "notifications", element: <NotificationsPage /> },
        ],
      },
    ],
  },

  // ✅ EMPLOYEE protected routes
  {
    element: <RequireRole allow={["EMPLOYEE"]} />,
    children: [
      {
        path: "/me",
        element: <EmployeeLayout />,
        children: [
          { index: true, element: <Blank /> },
          { path: "blank", element: <Blank /> },

          { path: "profile", element: <Profile /> },
          { path: "activities", element: <MyActivities /> },
          { path: "applications", element: <AppliedActivities /> },
          { path: "recommendations", element: <Recommendations /> },
          { path: "history", element: <History /> },
          { path: "cv", element: <CvUpload /> },
          { path: "skills", element: <MySkillsPage /> },
          { path: "notifications", element: <NotificationsPage /> },
        ],
      },
    ],
  },
  {
    path: '/notifications',
    element: <NotificationsRedirect />,
  },
  { path: "/complete-profile", element: <CompleteProfile /> },
  { path: "*", element: <Navigate to="/" replace /> },
  
]);