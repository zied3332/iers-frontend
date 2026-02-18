import { createBrowserRouter, Navigate } from "react-router-dom";

import AuthLayout from "../pages/auth/AuthLayout";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

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
import ManagerDashboard from "../pages/manger/Dashboard";
import ManagerApprovals from "../pages/manger/Approvals";
import ManagerTeam from "../pages/manger/ManagerTeam";
import ManagerAnalytics from "../pages/manger/ManagerAnalytics";

// Employee pages
import MyActivities from "../pages/employee/MyActivities";
import Recommendations from "../pages/employee/Recommendations";
import History from "../pages/employee/History";
import CvUpload from "../pages/employee/CvUpload";

// ✅ Shared profile (used in HR + Manager + Employee)
import Profile from "../pages/profile/Profile";

export const router = createBrowserRouter([
  // Default landing (change if needed)
  { path: "/", element: <Navigate to="/hr/dashboard" replace /> },

  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Login /> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
    ],
  },

  {
    path: "/hr",
    element: <HrLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <HrDashboard /> },
      { path: "profile", element: <Profile /> },

      { path: "employees", element: <HrEmployees /> },
      { path: "employees/:id", element: <HrEmployeeDetails /> },

      { path: "skills-dashboard", element: <HrSkillsDashboard /> },

      // keep paths lowercase for consistency
      { path: "recommendations", element: <HrRecommendations /> },
      { path: "recommendations/generate", element: <HrGenerateRecommendations /> },

      { path: "users", element: <UsersManagement /> },
    ],
  },

  {
    path: "/manager",
    element: <ManagerLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <ManagerDashboard /> },
      { path: "profile", element: <Profile /> },

      { path: "approvals", element: <ManagerApprovals /> },
      { path: "team", element: <ManagerTeam /> },
      { path: "analytics", element: <ManagerAnalytics /> },
    ],
  },

  {
    path: "/me",
    element: <EmployeeLayout />,
    children: [
      { index: true, element: <Navigate to="profile" replace /> },
      { path: "profile", element: <Profile /> },

      { path: "activities", element: <MyActivities /> },
      { path: "recommendations", element: <Recommendations /> },
      { path: "history", element: <History /> },
      { path: "cv", element: <CvUpload /> },
    ],
  },

  // Optional: catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);