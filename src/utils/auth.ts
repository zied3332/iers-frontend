// src/utils/auth.ts
import type { NavigateFunction } from "react-router-dom";

async function backendLogout() {
  try {
    const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const token = localStorage.getItem("token");
    if (!token) return;

    // optional: tell backend to set en_ligne=false
    await fetch(`${BASE}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // ignore network/backend errors
  }
}

export async function signOut(navigate: NavigateFunction) {
  // 1) best-effort backend logout (optional but nice)
  await backendLogout();

  // 2) clear ALL auth data (this is the real logout for JWT apps)
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // 3) strongest redirect: replace history so "Back" won't revive old session UI
  window.location.replace("/auth/login");

  // If you really want to use react-router navigate instead:
  // navigate("/auth/login", { replace: true });
}