const BASE = import.meta.env.VITE_API_URL;

async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type EvaluationPresence = "PRESENT" | "ABSENT";

export interface SkillScoreItem {
  skillId: string;
  score: number; // 1-5
}

export interface CreateEvaluationPayload {
  activityId: string;
  employeeId: string;
  presence: EvaluationPresence;
  feedback?: string;
  skillScores?: SkillScoreItem[];
}

export interface PostActivityEvaluation {
  _id: string;
  activityId: any;
  employeeId: any;
  reviewedBy: any;
  presence: EvaluationPresence;
  feedback: string;
  skillScores: Array<{ skillId: any; score: number }>;
  createdAt: string;
}

export interface ActivityEvalProgress {
  activity: {
    _id: string;
    title: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  totalParticipants: number;
  reviewedCount: number;
  pendingCount: number;
  isFullyReviewed: boolean;
}

export interface ParticipantEvalStatus {
  employee: {
    _id: string;
    user_id?: { name: string; email: string; avatarUrl?: string };
    jobTitle?: string;
  };
  evaluation: PostActivityEvaluation | null;
  isEvaluated: boolean;
}

export interface ActivityParticipantsEval {
  activity: any;
  participants: ParticipantEvalStatus[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** List completed activities with evaluation progress */
export async function getCompletedActivitiesForEvaluation(): Promise<ActivityEvalProgress[]> {
  return api("/post-evaluations/activities");
}

/** Get participants + their eval status for one activity */
export async function getParticipantsForEvaluation(
  activityId: string
): Promise<ActivityParticipantsEval> {
  return api(`/post-evaluations/activity/${activityId}/participants`);
}

/** Submit one evaluation */
export async function submitEvaluation(
  payload: CreateEvaluationPayload
): Promise<{ message: string; evaluation: PostActivityEvaluation }> {
  return api("/post-evaluations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Submit evaluations for multiple employees */
export async function submitBulkEvaluations(
  evaluations: CreateEvaluationPayload[]
): Promise<{ created: number; skipped: number }> {
  return api("/post-evaluations/bulk", {
    method: "POST",
    body: JSON.stringify({ evaluations }),
  });
}

/** Get all evaluations received by an employee */
export async function getEvaluationsByEmployee(
  employeeId: string
): Promise<PostActivityEvaluation[]> {
  return api(`/post-evaluations/employee/${employeeId}`);
}