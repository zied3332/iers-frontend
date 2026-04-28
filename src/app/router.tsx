import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";

import AuthLayout from "../pages/auth/AuthLayout";
import HrLayout from "../layouts/HrLayout";
import SuperManagerLayout from "../layouts/SuperManagerLayout";
import ManagerLayout from "../layouts/ManagerLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";

const LandingPage = lazy(() => import("../pages/LandingPage"));
const Login = lazy(() => import("../pages/auth/Login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const CompleteProfile = lazy(() => import("../pages/auth/CompleteProfile"));
const AccountPending = lazy(() => import("../pages/auth/AccountPending"));

const HrRecommendationPage = lazy(() => import("../pages/hr/HrRecommendationPage"));
const HrEmployees = lazy(() => import("../pages/hr/Employees"));
const UsersManagement = lazy(() => import("../pages/hr/UsersManagement"));
const HrDepartments = lazy(() => import("../pages/hr/Departments"));
const HrActivitiesManagement = lazy(() => import("../pages/hr/ActivitiesManagement"));
const HrSkillsDashboard = lazy(() => import("../pages/hr/HrSkillsDashboard"));
const AccountManagementPage = lazy(() => import("../pages/hr/AccountManagementPage"));
const SkillsManagementPage = lazy(() => import("../pages/hr/skills/SkillsManagementPage"));
const AssignSkillPage = lazy(() => import("../pages/hr/skills/AssignSkillPage"));
const AssignSkillTablePage = lazy(() => import("../pages/hr/skills/AssignSkillTablePage"));
const AssignExperiencePage = lazy(() => import("../pages/hr/experience/AssignExperiencePage"));
const AssignExperienceTablePage = lazy(() => import("../pages/hr/experience/AssignExperienceTablePage"));
const DomainManagementPage = lazy(() => import("../pages/hr/domains/DomainManagementPage"));
const HrCopilotPage = lazy(() => import("../pages/hr/HrCopilotPage"));
const HrStatsDashboard = lazy(() => import("../pages/hr/HrStatsDashboard"));
const HrCalendarPage = lazy(() => import("../pages/hr/HrCalendarPage"));
const ActivityStaffingPage = lazy(() => import("../pages/hr/ActivityStaffingPage"));
const ManagerDecisionsPage = lazy(() => import("../pages/hr/ManagerDecisionsPage"));
const HrStaffingPipelinePage = lazy(() =>
  import("../pages/hr/HrFilteredActivitiesPage").then((m) => ({ default: m.HrStaffingPipelinePage }))
);
const HrCompletedActivitiesPage = lazy(() =>
  import("../pages/hr/HrFilteredActivitiesPage").then((m) => ({ default: m.HrCompletedActivitiesPage }))
);
const HrCancelledActivitiesPage = lazy(() =>
  import("../pages/hr/HrFilteredActivitiesPage").then((m) => ({ default: m.HrCancelledActivitiesPage }))
);
const HrCompletedActivityDetailsPage = lazy(() => import("../pages/hr/HrCompletedActivityDetailsPage"));

const ManagerTeam = lazy(() => import("../pages/manger/ManagerTeam"));
const ManagerActivities = lazy(() => import("../pages/manger/ManagerActivities"));
const ManagerDashboard = lazy(() => import("../pages/manger/ManagerDashboard"));
const ManagerActivityReviewPage = lazy(() => import("../pages/manger/ManagerActivityReviewPage"));
const ManagerRunningActivitiesPage = lazy(() =>
  import("../pages/manger/ManagerFilteredActivitiesPage").then((m) => ({ default: m.ManagerRunningActivitiesPage }))
);
const ManagerPastActivitiesPage = lazy(() =>
  import("../pages/manger/ManagerFilteredActivitiesPage").then((m) => ({ default: m.ManagerPastActivitiesPage }))
);
const ManagerInProgressActivityPage = lazy(() => import("../pages/hr/ManagerInProgressActivityPage"));
const ManagerPastActivitiesEvalPage = lazy(() => import("../pages/manger/ManagerPastActivitiesPage"));
const TextCorrectionPage = lazy(() => import("../pages/ai/TextCorrectionPage"));

const CvUpload = lazy(() => import("../pages/employee/CvUpload"));
const MySkillsPage = lazy(() => import("../pages/employee/skills/MySkillsPage"));
const EmployeeActivityInvitationsPage = lazy(() => import("../pages/employee/EmployeeActivityInvitationsPage"));
const EmployeeActivityArchivePage = lazy(() => import("../pages/employee/EmployeeActivityArchivePage"));
const EmployeeActivityInvitationDetailPage = lazy(() => import("../pages/employee/EmployeeActivityInvitationDetailPage"));
const AuditHistoryPage = lazy(() => import("../pages/audit/AuditHistoryPage"));

const Profile = lazy(() => import("../pages/profile/Profile"));
const NotificationsPage = lazy(() => import("../pages/notifications/NotificationsPage"));
const HrDashboard = lazy(() => import("../pages/hr/Dashboard"));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));
const ManagerEvaluateActivityPage = lazy(() => import("../pages/manger/ManagerEvaluateActivityPage"));
const PostActivityFinalizedPage = lazy(() => import("../pages/manger/PostActivityFinalizedPage"));
const PostActivityEvaluationReadOnlyPage = lazy(() => import("../pages/manger/PostActivityEvaluationReadOnlyPage"));
const HrEmployeeDetails = lazy(() => import("../pages/hr/EmployeeDetails"));
const AppearanceSettingsPage = lazy(() => import("../pages/settings/AppearanceSettingsPage"));

function withSuspense(node: ReactNode) {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      {node}
    </Suspense>
  );
}
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
  { path: "/", element: withSuspense(<LandingPage />) },
  { path: "/403", element: <Forbidden /> },

  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: withSuspense(<Login />) },
      { path: "login", element: withSuspense(<Login />) },
      { path: "signup", element: withSuspense(<Signup />) },
      { path: "forgot-password", element: withSuspense(<ForgotPassword />) },
      { path: "reset-password", element: withSuspense(<ResetPassword />) },
      { path: "account-pending", element: withSuspense(<AccountPending />) },
    ],
  },

  {
    element: <RequireRole allow={["HR"]} />,
    children: [
      {
        path: "/hr",
        element: <HrLayout />,
        children: [
          { path: "dashboard", element: withSuspense(<HrStatsDashboard />) },
          { path: "employees", element: withSuspense(<HrEmployees />) },
          { path: "users", element: withSuspense(<UsersManagement />) },
          { path: "pending-users", element: withSuspense(<AccountManagementPage />) },
          { path: "account-management", element: withSuspense(<AccountManagementPage />) },
          { path: "departments", element: withSuspense(<HrDepartments />) },
          { path: "activities", element: withSuspense(<HrActivitiesManagement />) },
          { path: "activities/pipeline", element: withSuspense(<HrStaffingPipelinePage />) },
          { path: "activities/archive", element: withSuspense(<HrCompletedActivitiesPage />) },
          { path: "activities/cancelled", element: withSuspense(<HrCancelledActivitiesPage />) },
          { path: "activities/:activityId/completed-details", element: withSuspense(<HrCompletedActivityDetailsPage />) },
          { path: "activities/:activityId/staffing", element: withSuspense(<ActivityStaffingPage />) },
          { path: "activities/:activityId/manager-decisions", element: withSuspense(<ManagerDecisionsPage />) },
          // path: "activities/archive", element: <ManagerPastActivitiesPage /> },
          { path: "activities/:activityId/evaluate", element: withSuspense(<ManagerEvaluateActivityPage />) },
          { path: "activities/:activityId/evaluated", element: withSuspense(<PostActivityEvaluationReadOnlyPage />) },
          { path: "activities/evaluated", element: withSuspense(<PostActivityFinalizedPage />) },
          { path: "skills-dashboard", element: withSuspense(<HrSkillsDashboard />) },
          { path: "copilot", element: withSuspense(<HrCopilotPage />) },
          { path: "skills", element: withSuspense(<SkillsManagementPage />) },
          { path: "domains", element: withSuspense(<DomainManagementPage />) },
          { path: "skills/assign", element: withSuspense(<AssignSkillPage />) },
          { path: "skills/assign-table", element: withSuspense(<AssignSkillTablePage />) },
          { path: "experience/assign", element: withSuspense(<AssignExperiencePage />) },
          { path: "experience/assign-table", element: withSuspense(<AssignExperienceTablePage />) },
          { path: "ai/text-correction", element: withSuspense(<TextCorrectionPage />) },
          { path: "profile", element: withSuspense(<Profile />) },
          { path: "history", element: withSuspense(<AuditHistoryPage />) },
          { path: "notifications", element: withSuspense(<NotificationsPage />) },
          { path: "notifications/:side", element: withSuspense(<NotificationsPage />) },
          { path: "settings", element: withSuspense(<SettingsPage />) },
          { path: "employees/:id", element: withSuspense(<Profile />) },
          { path: "calendar", element: withSuspense(<HrCalendarPage />) },
          { path: "activities/:activityId/recommendation", element: withSuspense(<HrRecommendationPage />) },
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
          { path: "dashboard", element: withSuspense(<HrDashboard />) },
          { path: "employees", element: withSuspense(<HrEmployees />) },
          { path: "users", element: withSuspense(<UsersManagement />) },
          { path: "departments", element: withSuspense(<HrDepartments />) },
          { path: "activities", element: withSuspense(<HrActivitiesManagement />) },
          { path: "skills-dashboard", element: withSuspense(<HrSkillsDashboard />) },
          { path: "skills", element: withSuspense(<SkillsManagementPage />) },
          { path: "domains", element: withSuspense(<DomainManagementPage />) },
          { path: "skills/assign", element: withSuspense(<AssignSkillPage />) },
          { path: "skills/assign-table", element: withSuspense(<AssignSkillTablePage />) },
          { path: "experience/assign", element: withSuspense(<AssignExperiencePage />) },
          { path: "experience/assign-table", element: withSuspense(<AssignExperienceTablePage />) },
          { path: "profile", element: withSuspense(<Profile />) },
          { path: "history", element: withSuspense(<AuditHistoryPage />) },
          { path: "notifications", element: withSuspense(<NotificationsPage />) },
          { path: "notifications/:side", element: withSuspense(<NotificationsPage />) },
          { path: "settings", element: withSuspense(<SettingsPage />) },
          { path: "employees/:id", element: withSuspense(<Profile />) },
          { path: "activities/:activityId/evaluate", element: withSuspense(<ManagerEvaluateActivityPage />) },
          { path: "activities/:activityId/evaluated", element: withSuspense(<PostActivityEvaluationReadOnlyPage />) },
          { path: "activities/evaluated", element: withSuspense(<PostActivityFinalizedPage />) },
          { path: "calendar", element: withSuspense(<HrCalendarPage />) },
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
          { index: true, element: withSuspense(<ManagerDashboard />) },
          { path: "dashboard", element: withSuspense(<ManagerDashboard />) },
          { path: "team", element: withSuspense(<ManagerTeam />) },
          { path: "activities", element: withSuspense(<ManagerActivities />) },
          { path: "activities/running", element: withSuspense(<ManagerRunningActivitiesPage />) },
          { path: "activities/archive", element: withSuspense(<ManagerPastActivitiesPage />) },
          { path: "activities/:activityId/review", element: withSuspense(<ManagerActivityReviewPage />) },
          { path: "activities/:activityId/staffing", element: <ManagerStaffingToReviewRedirect /> },
          { path: "skills", element: withSuspense(<SkillsManagementPage />) },
          { path: "domains", element: withSuspense(<DomainManagementPage />) },
          { path: "skills/assign", element: withSuspense(<AssignSkillPage />) },
          { path: "skills/assign-table", element: withSuspense(<AssignSkillTablePage />) },
          { path: "experience/assign", element: withSuspense(<AssignExperiencePage />) },
          { path: "experience/assign-table", element: withSuspense(<AssignExperienceTablePage />) },
          { path: "profile", element: withSuspense(<Profile />) },
          { path: "history", element: withSuspense(<AuditHistoryPage />) },
          { path: "notifications", element: withSuspense(<NotificationsPage />) },
          { path: "notifications/:side", element: withSuspense(<NotificationsPage />) },
          { path: "settings", element: withSuspense(<SettingsPage />) },
          { path: "employees/:id", element: withSuspense(<Profile />) },
          { path: "activities/:activityId/monitor", element: withSuspense(<ManagerInProgressActivityPage />) },
          { path: "activities/evaluations", element: withSuspense(<ManagerPastActivitiesEvalPage />) },
          { path: "activities/evaluated", element: withSuspense(<PostActivityFinalizedPage />) },
          { path: "activities/:activityId/evaluate", element: withSuspense(<ManagerEvaluateActivityPage />) },
          { path: "activities/:activityId/evaluated", element: withSuspense(<PostActivityEvaluationReadOnlyPage />) },
          { path: "calendar", element: withSuspense(<HrCalendarPage />) },
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
          { path: "profile", element: withSuspense(<Profile />) },
          { path: "history", element: withSuspense(<AuditHistoryPage />) },
          { path: "cv", element: withSuspense(<CvUpload />) },
          { path: "skills", element: withSuspense(<MySkillsPage />) },
          { path: "activity-invitations", element: withSuspense(<EmployeeActivityInvitationsPage />) },
          { path: "activities/archive", element: withSuspense(<EmployeeActivityArchivePage />) },
          {
            path: "activity-invitations/:invitationId",
            element: withSuspense(<EmployeeActivityInvitationDetailPage />),
          },
          { path: "notifications", element: withSuspense(<NotificationsPage />) },
          { path: "notifications/:side", element: withSuspense(<NotificationsPage />) },
          { path: "settings", element: withSuspense(<SettingsPage />) },
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

  { path: "/complete-profile", element: withSuspense(<CompleteProfile />) },
  // Temporary debug routes for currently unlinked legacy pages.
  { path: "/dev/hr-employee-details/:id", element: withSuspense(<HrEmployeeDetails />) },
  { path: "/dev/settings-appearance", element: withSuspense(<AppearanceSettingsPage />) },
  { path: "*", element: <Navigate to="/" replace /> },
]);