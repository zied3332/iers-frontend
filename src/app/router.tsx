import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";

import LandingPage from "../pages/LandingPage";
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
import AccountManagementPage from "../pages/hr/AccountManagementPage";
import SkillsManagementPage from "../pages/hr/skills/SkillsManagementPage";
import AssignSkillPage from "../pages/hr/skills/AssignSkillPage";
import HrCopilotPage from "../pages/hr/HrCopilotPage";
import HrStatsDashboard from "../pages/hr/HrStatsDashboard";
import HrCalendarPage from "../pages/hr/HrCalendarPage.tsx";
import ActivityStaffingPage from "../pages/hr/ActivityStaffingPage";
import ManagerDecisionsPage from "../pages/hr/ManagerDecisionsPage";
import {
  HrStaffingPipelinePage,
  HrCompletedActivitiesPage,
} from "../pages/hr/HrFilteredActivitiesPage";

// Manager pages
import ManagerTeam from "../pages/manger/ManagerTeam";
import ManagerActivities from "../pages/manger/ManagerActivities.tsx";
import ManagerDashboard from "../pages/manger/ManagerDashboard";
import ManagerActivityReviewPage from "../pages/manger/ManagerActivityReviewPage";
import {
  ManagerRunningActivitiesPage,
  ManagerPastActivitiesPage,
} from "../pages/manger/ManagerFilteredActivitiesPage";

// AI pages
import TextCorrectionPage from "../pages/ai/TextCorrectionPage";

// Employee pages
import CvUpload from "../pages/employee/CvUpload";
import MySkillsPage from "../pages/employee/skills/MySkillsPage";
import EmployeeActivityInvitationsPage from "../pages/employee/EmployeeActivityInvitationsPage";
import EmployeeActivityArchivePage from "../pages/employee/EmployeeActivityArchivePage";
import EmployeeActivityInvitationDetailPage from "../pages/employee/EmployeeActivityInvitationDetailPage";
import AuditHistoryPage from "../pages/audit/AuditHistoryPage";

import Blank from "../pages/Blank";
import Profile from "../pages/profile/Profile";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import HrDashboard from "../pages/hr/Dashboard.tsx";
import CompleteProfile from "../pages/auth/CompleteProfile";
import AccountPending from "../pages/auth/AccountPending";

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
  const { side } = useParams<{ side?: string }>();
  const safeSide = side === "unread" || side === "read" ? `/${side}` : "";
  const role = getRole();

  if (role === "HR") return <Navigate to={`/hr/notifications${safeSide}`} replace />;
  if (role === "SUPER_MANAGER")
    return <Navigate to={`/super-manager/notifications${safeSide}`} replace />;
  if (role === "MANAGER")
    return <Navigate to={`/manager/notifications${safeSide}`} replace />;
  if (role === "EMPLOYEE") return <Navigate to={`/me/notifications${safeSide}`} replace />;

  return <Navigate to="/auth/login" replace />;
}

function ManagerStaffingToReviewRedirect() {
  const { activityId = "" } = useParams();
  return <Navigate to={`/manager/activities/${activityId}/review`} replace />;
}

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
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
      { path: "account-pending", element: <AccountPending /> },
    ],
  },

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
          { path: "employees", element: <HrEmployees /> },
          { path: "users", element: <UsersManagement /> },
          { path: "pending-users", element: <AccountManagementPage /> },
          { path: "account-management", element: <AccountManagementPage /> },
          { path: "departments", element: <HrDepartments /> },
          { path: "activities", element: <HrActivitiesManagement /> },
          { path: "activities/pipeline", element: <HrStaffingPipelinePage /> },
          { path: "activities/archive", element: <HrCompletedActivitiesPage /> },
          { path: "activities/:activityId/staffing", element: <ActivityStaffingPage /> },
          { path: "activities/:activityId/manager-decisions", element: <ManagerDecisionsPage /> },
          { path: "skills-dashboard", element: <HrSkillsDashboard /> },
          { path: "recommendations", element: <HrGenerateRecommendations /> },
          { path: "recommendations/generate", element: <HrGenerateRecommendations /> },
          { path: "copilot", element: <HrCopilotPage /> },
          { path: "skills", element: <SkillsManagementPage /> },
          { path: "skills/assign", element: <AssignSkillPage /> },
          { path: "ai/text-correction", element: <TextCorrectionPage /> },
          { path: "profile", element: <Profile /> },
          { path: "history", element: <AuditHistoryPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "notifications/:side", element: <NotificationsPage /> },
          { path: "employees/:id", element: <Profile /> },
          { path: "calendar", element: <HrCalendarPage /> },
        ],
      },
    ],
  },

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
          { path: "skills-dashboard", element: <HrSkillsDashboard /> },
          { path: "recommendations", element: <HrGenerateRecommendations /> },
          { path: "recommendations/generate", element: <HrGenerateRecommendations /> },
          { path: "skills", element: <SkillsManagementPage /> },
          { path: "skills/assign", element: <AssignSkillPage /> },
          { path: "profile", element: <Profile /> },
          { path: "history", element: <AuditHistoryPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "notifications/:side", element: <NotificationsPage /> },
          { path: "employees/:id", element: <Profile /> },
        ],
      },
    ],
  },

  {
    element: <RequireRole allow={["MANAGER"]} />,
    children: [
      {
        path: "/manager",
        element: <ManagerLayout />,
        children: [
          { index: true, element: <ManagerDashboard /> },
          { path: "blank", element: <Blank /> },

          { path: "dashboard", element: <ManagerDashboard /> },
          { path: "team", element: <ManagerTeam /> },
          { path: "activities", element: <ManagerActivities /> },
          { path: "activities/running", element: <ManagerRunningActivitiesPage /> },
          { path: "activities/archive", element: <ManagerPastActivitiesPage /> },
          { path: "activities/:activityId/review", element: <ManagerActivityReviewPage /> },
          { path: "activities/:activityId/staffing", element: <ManagerStaffingToReviewRedirect /> },
          { path: "skills", element: <SkillsManagementPage /> },
          { path: "skills/assign", element: <AssignSkillPage /> },
          { path: "profile", element: <Profile /> },
          { path: "history", element: <AuditHistoryPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "notifications/:side", element: <NotificationsPage /> },
          { path: "employees/:id", element: <Profile /> },
        ],
      },
    ],
  },

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
          { path: "history", element: <AuditHistoryPage /> },
          { path: "cv", element: <CvUpload /> },
          { path: "skills", element: <MySkillsPage /> },
          { path: "activity-invitations", element: <EmployeeActivityInvitationsPage /> },
          { path: "activities/archive", element: <EmployeeActivityArchivePage /> },
          {
            path: "activity-invitations/:invitationId",
            element: <EmployeeActivityInvitationDetailPage />,
          },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "notifications/:side", element: <NotificationsPage /> },
        ],
      },
    ],
  },

  {
    path: "/notifications",
    element: <NotificationsRedirect />,
  },
  {
    path: "/notifications/:side",
    element: <NotificationsRedirect />,
  },

  { path: "/complete-profile", element: <CompleteProfile /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);