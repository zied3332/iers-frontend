const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

/* ================= TYPES ================= */

export type RecommendationDecision =
  | "RECOMMENDED"
  | "POSSIBLE_WITH_GAP"
  | "NOT_RECOMMENDED";

export type RecommendationSelectionGroup =
  | "PRIMARY"
  | "BACKUP"
  | "NOT_RECOMMENDED";

export type RecommendationItem = {
  employeeId: string;
  fullName: string;
  email: string;
  rank: number;
  finalScore: number;
  decision: RecommendationDecision;
  selectionGroup: RecommendationSelectionGroup;
  explanation: string;
  strengths: string[];
  risks: string[];
  nextAction: string;
  breakdown: {
    skillMatch: number;
    contextFit: number;
    experienceFit: number;
    historyFit: number;
  };
};

export type RecommendationFinalResponse = {
  activityId: string;
  seats: number;
  backupCount: number;
  summary: {
    totalCandidates: number;
    primaryCount: number;
    backupCount: number;
    notRecommendedCount: number;
    recommended: number;
    possibleWithGap: number;
    notRecommended: number;
  };
  primaryCandidates: RecommendationItem[];
  backupCandidates: RecommendationItem[];
  notRecommendedCandidates: RecommendationItem[];
};

export type SaveHrShortlistPayload = {
  employeeIds: string[];
  hrNote?: string;
  hrInvitationResponseDays?: number;
};

export type ActivityReviewRecord = {
  _id?: string;
  activityId?: string;
};

export type SubmitHrShortlistResponse = {
  review?: ActivityReviewRecord;
  message?: string;
};

/* ================= HELPERS ================= */

function authHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  const txt = await res.text();

  if (!res.ok) {
    let msg = txt || "Request failed";

    try {
      const parsed = txt ? JSON.parse(txt) : {};
      msg = parsed?.message || parsed?.error || msg;
    } catch {}

    throw new Error(msg);
  }

  return (txt ? JSON.parse(txt) : null) as T;
}

function normalizeNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((v) => String(v)).filter(Boolean)
    : [];
}

/* ================= 🔥 FIX IS HERE ================= */

function extractId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return (
      value._id ||
      value.id ||
      value.employeeId ||
      ""
    );
  }

  return "";
}

function mapRecommendationItem(raw: any): RecommendationItem {
  const employeeNode =
    raw?.employee ||
    raw?.employeeId ||
    raw?.user ||
    raw;

  return {
    employeeId: extractId(employeeNode),

    fullName: String(
      raw?.fullName ||
        raw?.name ||
        raw?.employee?.name ||
        "Unknown employee"
    ),

    email: String(
      raw?.email ||
        raw?.employee?.email ||
        ""
    ),

    rank: normalizeNumber(raw?.rank),

    finalScore: normalizeNumber(
      raw?.finalScore ?? raw?.final_score
    ),

    decision: String(
      raw?.decision || "NOT_RECOMMENDED"
    ) as RecommendationDecision,

    selectionGroup: String(
      raw?.selectionGroup ||
        raw?.selection_group ||
        "NOT_RECOMMENDED"
    ) as RecommendationSelectionGroup,

    explanation: String(raw?.explanation || ""),

    strengths: normalizeStringArray(raw?.strengths),
    risks: normalizeStringArray(raw?.risks),

    nextAction: String(
      raw?.nextAction || raw?.next_action || ""
    ),

    breakdown: {
      skillMatch: normalizeNumber(
        raw?.breakdown?.skillMatch ??
          raw?.breakdown?.skill_match
      ),
      contextFit: normalizeNumber(
        raw?.breakdown?.contextFit ??
          raw?.breakdown?.context_fit
      ),
      experienceFit: normalizeNumber(
        raw?.breakdown?.experienceFit ??
          raw?.breakdown?.experience_fit
      ),
      historyFit: normalizeNumber(
        raw?.breakdown?.historyFit ??
          raw?.breakdown?.history_fit
      ),
    },
  };
}

function mapRecommendationFinalResponse(
  raw: any
): RecommendationFinalResponse {
  return {
    activityId: String(raw?.activityId || ""),
    seats: normalizeNumber(raw?.seats),
    backupCount: normalizeNumber(raw?.backupCount),

    summary: {
      totalCandidates: normalizeNumber(raw?.summary?.totalCandidates),
      primaryCount: normalizeNumber(raw?.summary?.primaryCount),
      backupCount: normalizeNumber(raw?.summary?.backupCount),
      notRecommendedCount: normalizeNumber(raw?.summary?.notRecommendedCount),
      recommended: normalizeNumber(raw?.summary?.recommended),
      possibleWithGap: normalizeNumber(raw?.summary?.possibleWithGap),
      notRecommended: normalizeNumber(raw?.summary?.notRecommended),
    },

    primaryCandidates: (raw?.primaryCandidates || []).map(mapRecommendationItem),
    backupCandidates: (raw?.backupCandidates || []).map(mapRecommendationItem),
    notRecommendedCandidates: (raw?.notRecommendedCandidates || []).map(mapRecommendationItem),
  };
}

/* ================= API ================= */

export async function getFinalRecommendations(
  activityId: string
): Promise<RecommendationFinalResponse> {
  const res = await fetch(
    `${BASE}/activities/${activityId}/recommendation-final`,
    {
      headers: authHeaders(),
    }
  );

  const data = await handle<any>(res);
  return mapRecommendationFinalResponse(data);
}

export async function saveHrShortlist(
  activityId: string,
  payload: SaveHrShortlistPayload
) {
  const res = await fetch(
    `${BASE}/activity-reviews/${activityId}/hr-shortlist`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return handle(res);
}

export async function submitHrShortlistToManager(
  activityId: string
) {
  const res = await fetch(
    `${BASE}/activity-reviews/${activityId}/submit-to-manager`,
    {
      method: "PATCH",
      headers: authHeaders(),
    }
  );

  return handle(res);
}