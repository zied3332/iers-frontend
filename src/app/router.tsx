import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthLayout from "../pages/auth/AuthLayout";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import HrLayout from "../layouts/HrLayout";
import ManagerLayout from "../layouts/ManagerLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";
import HrGenerateRecommendations from "../pages/hr/GenerateRecommendations";
import HrDashboard from "../pages/hr/Dashboard";
import HrEmployees from "../pages/hr/Employees";
import HrEmployeeDetails from "../pages/hr/EmployeeDetails";
import HrSkillsDashboard from "../pages/hr/HrSkillsDashboard";
import ManagerDashboard from "../pages/manger/Dashboard";
import ManagerApprovals from "../pages/manger/Approvals";
import EmployeeProfile from "../pages/employee/Profile";
import MyActivities from "../pages/employee/MyActivities";
import Recommendations from "../pages/employee/Recommendations";
import History from "../pages/employee/History";
import HrRecommendations from "../pages/hr/Recommendations"
export const router = createBrowserRouter([
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
      { path: "dashboard", element: <HrDashboard /> },
      { path: "employees", element: <HrEmployees /> },
      { path: "employees/:id", element: <HrEmployeeDetails /> }, // ✅ NEW
      { path: "skills-dashboard", element: <HrSkillsDashboard /> }, 
          { path: "Recommendations", element: <HrRecommendations /> }, 
          { path: "recommendations/generate", element: <HrGenerateRecommendations /> },
          

    ],
  },
  {
    path: "/manager",
    element: <ManagerLayout />,
    children: [{ path: "dashboard", element: <ManagerDashboard /> },
      { path: "approvals", element: <ManagerApprovals /> },
    ],
  },
  {
    path: "/me",
    element: <EmployeeLayout />,
    children: [{ path: "profile", element: <EmployeeProfile /> },
      { path: "activities", element: <MyActivities /> },
      { path: "recommendations", element: <Recommendations /> },
      { path: "history", element: <History /> },],
  },
  
]);