import type { ActivityReviewRecord } from "../types/activity-review";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders(): HeadersInit {
  const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
  const normalizedToken = String(rawToken || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  return {
    "Content-Type": "application/json",
    ...(normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {}),
  };
}

async function handle(res: Response) {
  const txt = await res.text();
  if (!res.ok) {
    let msg = txt || "Request failed";
    try {
      const parsed = txt ? JSON.parse(txt) : {};
      const raw = Array.isArray(parsed?.message)
        ? parsed.message.join(", ")
        : parsed?.message || parsed?.error;
      if (typeof raw === "string" && raw.trim()) msg = raw;
    } catch {
      // keep fallback
    }
    if (res.status === 401) {
      msg = "Unauthorized session. Please sign in with an HR account.";
    }
    throw new Error(msg);
  }
  return txt ? JSON.parse(txt) : null;
}

export async function getActivityReview(
  activityId: string
): Promise<ActivityReviewRecord | null> {
  const res = await fetch(`${BASE}/activity-reviews/${activityId}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  const data = await handle(res);
  return data as ActivityReviewRecord;
}

export async function saveHrShortlist(
  activityId: string,
  body: {
    employeeIds: string[];
    candidateSnapshots?: any[];
    hrNote?: string;
    hrInvitationResponseDays?: number;
  }
): Promise<{ message: string; review: ActivityReviewRecord }> {
  const res = await fetch(
    `${BASE}/activity-reviews/${encodeURIComponent(activityId)}/hr-shortlist`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }
  );

  return handle(res) as Promise<{ message: string; review: ActivityReviewRecord }>;
}
export async function submitHrShortlistToManager(
  activityId: string
): Promise<{ message: string; review: ActivityReviewRecord }> {
  const res = await fetch(
    `${BASE}/activity-reviews/${encodeURIComponent(activityId)}/submit-to-manager`,
    {
      method: "PATCH",
      headers: authHeaders(),
    }
  );
  return handle(res) as Promise<{ message: string; review: ActivityReviewRecord }>;
}

export async function approveActivityReview(
  activityId: string,
  body: {
    managerSelectedEmployeeIds: string[];
    managerNote?: string;
    managerReplacementResponseDays?: number;
  }
): Promise<{ message: string; review: ActivityReviewRecord }> {
  const res = await fetch(
    `${BASE}/activity-reviews/${encodeURIComponent(activityId)}/approve`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }
  );
  return handle(res) as Promise<{ message: string; review: ActivityReviewRecord }>;
}

export async function requestActivityReviewChanges(
  activityId: string,
  body: { managerSelectedEmployeeIds: string[]; managerNote?: string }
): Promise<{ message: string; review: ActivityReviewRecord }> {
  const res = await fetch(
    `${BASE}/activity-reviews/${encodeURIComponent(activityId)}/request-changes`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }
  );
  return handle(res) as Promise<{ message: string; review: ActivityReviewRecord }>;
}
