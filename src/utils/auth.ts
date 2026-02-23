import { logout } from "../services/auth.service";


export async function signOut(navigate: (path: string) => void) {
  try {
    await logout();
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth/login");
  }
}