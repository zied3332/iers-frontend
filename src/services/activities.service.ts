const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type ActivityType = "TRAINING" | "CERTIFICATION" | "PROJECT" | "MISSION" | "AUDIT";
export type SkillType = "KNOWLEDGE" | "KNOW_HOW" | "SOFT";
export type DesiredLevel = "LOW" | "MEDIUM" | "HIGH";
export type PriorityContext = "UPSKILLING" | "EXPERTISE" | "DEVELOPMENT";
export type ActivityStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type RequiredSkill = {
  name: string;
  type: SkillType;
  desiredLevel: DesiredLevel;
};

export type ActivityRecord = {
  _id: string;
  title: string;
  type: ActivityType;
  requiredSkills: RequiredSkill[];
  availableSlots: number;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  duration: string;
  status: ActivityStatus;
  responsibleManagerId?: string;
  responsibleManagerName?: string;
  departmentId?: string;
  departmentName?: string;
  priorityContext: PriorityContext;
  targetLevel: DesiredLevel;
  createdAt: string;
  workflowStatus?: string;
  rosterReadyForHrAt?: string | null;
  hrFinalLaunchAt?: string | null;
};

/** Payload for create/update; `status` is system-controlled (planned → in progress → completed / cancel). */
export type CreateActivityInput = Omit<ActivityRecord, "_id" | "createdAt" | "status">;

function authHeaders() {
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
      // keep fallback message
    }

    if (res.status === 401) {
      msg = "Unauthorized session. Please sign out and log in again.";
    }
    // 403: keep API message (e.g. manager review not available until HR sends the list)

    throw new Error(msg);
  }

  return txt ? JSON.parse(txt) : null;
}

async function requestWithFallback(
  paths: string[],
  options: RequestInit
): Promise<unknown> {
  let lastError: Error | null = null;

  for (const path of paths) {
    const res = await fetch(`${BASE}${path}`, options);

    if (res.ok) {
      return handle(res);
    }

    // Try next candidate only for not-found/method mismatch routes.
    if (res.status === 404 || res.status === 405) {
      const body = await res.text();
      lastError = new Error(body || `Cannot ${options.method || "GET"} ${path}`);
      continue;
    }

    try {
      await handle(res);
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error("Request failed");
    }
    break;
  }

  if (lastError) throw lastError;
  throw new Error("Request failed: no endpoint candidate available.");
}

function toId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return undefined;
}

function mapApiActivity(raw: any): ActivityRecord {
  const toEnum = <T extends string>(value: any, allowed: readonly T[], fallback: T): T => {
    const normalized = String(value || "").toUpperCase() as T;
    return allowed.includes(normalized) ? normalized : fallback;
  };

  const legacyPriority = String(raw?.context_priority || "").toUpperCase();
  const fallbackLevel = ["LOW", "MEDIUM", "HIGH"].includes(legacyPriority)
    ? (legacyPriority as DesiredLevel)
    : "MEDIUM";

  const normalizedStatus = toEnum<ActivityStatus>(
    raw?.status,
    ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const,
    "PLANNED"
  );

  const normalizedContext = toEnum<PriorityContext>(
    raw?.context,
    ["UPSKILLING", "EXPERTISE", "DEVELOPMENT"] as const,
    "DEVELOPMENT"
  );

  const normalizedLevel = toEnum<DesiredLevel>(
    raw?.priority_level || fallbackLevel,
    ["LOW", "MEDIUM", "HIGH"] as const,
    "MEDIUM"
  );

  const rosterReady = raw?.rosterReadyForHrAt;
  const hrLaunch = raw?.hrFinalLaunchAt;

  return {
    _id: String(raw?._id || ""),
    title: String(raw?.title || ""),
    type: String(raw?.type || "TRAINING") as ActivityType,
    requiredSkills: Array.isArray(raw?.requiredSkills) ? raw.requiredSkills : [],
    availableSlots: Number(raw?.seats || 0),
    description: String(raw?.description || ""),
    location: String(raw?.location || ""),
    startDate: String(raw?.startDate || ""),
    endDate: String(raw?.endDate || ""),
    duration: String(raw?.duration || ""),
    status: normalizedStatus,
    responsibleManagerId: toId(raw?.responsible_manager),
    responsibleManagerName:
      typeof raw?.responsible_manager?.name === "string"
        ? raw.responsible_manager.name
        : undefined,
    departmentId: toId(raw?.department),
    departmentName:
      typeof raw?.department?.name === "string" ? raw.department.name : undefined,
    priorityContext: normalizedContext,
    targetLevel: normalizedLevel,
    createdAt: String(raw?.created_at || raw?.createdAt || ""),
    workflowStatus: raw?.workflowStatus != null ? String(raw.workflowStatus) : undefined,
    rosterReadyForHrAt:
      rosterReady != null
        ? typeof rosterReady === "string"
          ? rosterReady
          : new Date(rosterReady).toISOString()
        : null,
    hrFinalLaunchAt:
      hrLaunch != null
        ? typeof hrLaunch === "string"
          ? hrLaunch
          : new Date(hrLaunch).toISOString()
        : null,
  };
}

export type ListActivitiesQuery = {
  /** Drafts: planned + workflow DRAFT (before IA/staffing). Pipeline / completed: HR lists */
  hrView?: "drafts" | "pipeline" | "completed" | "cancelled";
  /** Manager: activities in progress after HR launch vs completed/cancelled archive */
  managerView?: "running" | "past";
};

export async function listActivities(params?: ListActivitiesQuery): Promise<ActivityRecord[]> {
  const searchParams = new URLSearchParams();
  if (params?.hrView != null) searchParams.set("hrView", params.hrView);
  if (params?.managerView != null) searchParams.set("managerView", params.managerView);
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`${BASE}/activities${qs}`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await handle(res);
  const arr = Array.isArray(data) ? data : [];
  return arr.map(mapApiActivity);
}

export async function getActivityById(activityId: string): Promise<ActivityRecord> {
  const encodedId = encodeURIComponent(activityId);
  const res = await fetch(`${BASE}/activities/${encodedId}`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await handle(res);
  return mapApiActivity(data);
}

export async function createActivity(input: CreateActivityInput): Promise<ActivityRecord> {
  // Keep frontend-only fields out of payload (requiredSkills) because backend forbids unknown props.
  const payload: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    type: input.type,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    duration: input.duration,
    seats: input.availableSlots,
    context: input.priorityContext,
    priority_level: input.targetLevel,
  };

  if (input.responsibleManagerId) payload.responsible_manager = input.responsibleManagerId;
  if (input.departmentId) payload.department = input.departmentId;

  const res = await fetch(`${BASE}/activities`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handle(res);
  return mapApiActivity(data);
}

export async function updateActivityById(
  activityId: string,
  patch: Partial<CreateActivityInput>
): Promise<ActivityRecord> {
  const payload: Record<string, unknown> = {};

  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.type !== undefined) payload.type = patch.type;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.startDate !== undefined) payload.startDate = patch.startDate;
  if (patch.endDate !== undefined) payload.endDate = patch.endDate;
  if (patch.duration !== undefined) payload.duration = patch.duration;
  if (patch.availableSlots !== undefined) payload.seats = patch.availableSlots;
  if (patch.priorityContext !== undefined) payload.context = patch.priorityContext;
  if (patch.targetLevel !== undefined) payload.priority_level = patch.targetLevel;

  if (patch.responsibleManagerId !== undefined) {
    payload.responsible_manager = patch.responsibleManagerId || null;
  }
  if (patch.departmentId !== undefined) {
    payload.department = patch.departmentId || null;
  }

  const res = await fetch(`${BASE}/activities/${activityId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handle(res);
  return mapApiActivity(data);
}

export async function deleteActivityById(activityId: string): Promise<void> {
  const res = await fetch(`${BASE}/activities/${activityId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  await handle(res);
}

export async function cancelActivityById(activityId: string): Promise<ActivityRecord> {
  const encodedId = encodeURIComponent(activityId);
  const res = await fetch(`${BASE}/activities/${encodedId}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await handle(res);
  return mapApiActivity(data);
}

// ==================== Activity Skills ====================

export type ActivitySkillRecord = {
  _id: string;
  activity_id: string;
  skill_id: {
    _id: string;
    name: string;
    category: string;
    description: string;
  };
  required_level: "LOW" | "MEDIUM" | "HIGH" | "EXPERT";
  weight: number;
};

export type ParticipationStatus =
  | "ENROLLED"
  | "APPROVED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type ActivityParticipationRecord = {
  _id?: string;
  activityId?: string;
  employeeId: string;
  status: ParticipationStatus;
  employee?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    department?: string | { _id?: string; name?: string };
    [key: string]: unknown;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SkillScoreItem = {
  skillId: string;
  requiredLevel: "LOW" | "MEDIUM" | "HIGH" | "EXPERT";
  weight: number;
  employeeDynamicScore: number;
  contribution: number;
};

export type ActivityScoreResponse = {
  activityId: string;
  employeeId: string;
  weightedScore: number;
  weightTotal: number;
  globalScore: number;
  skillScores: SkillScoreItem[];
};

function normalizeParticipationStatus(value: unknown): ParticipationStatus {
  const normalized = String(value || "").toUpperCase();
  if (
    normalized === "ENROLLED" ||
    normalized === "APPROVED" ||
    normalized === "COMPLETED" ||
    normalized === "REJECTED" ||
    normalized === "CANCELLED"
  ) {
    return normalized;
  }
  return "ENROLLED";
}

function extractId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate = value as { _id?: unknown; id?: unknown };
    if (typeof candidate._id === "string") return candidate._id;
    if (typeof candidate.id === "string") return candidate.id;
  }
  return "";
}

function mapParticipation(raw: unknown): ActivityParticipationRecord {
  const source = (raw || {}) as Record<string, unknown>;
  const employeeNode =
    source.employee ??
    source.employee_id ??
    source.employeeId ??
    null;
  const employeeId = extractId(employeeNode || source.employeeId || source.employee_id);

  return {
    _id: extractId(source._id) || undefined,
    activityId: extractId(source.activity || source.activity_id || source.activityId) || undefined,
    employeeId,
    status: normalizeParticipationStatus(source.status),
    employee:
      employeeNode && typeof employeeNode === "object"
        ? (employeeNode as ActivityParticipationRecord["employee"])
        : null,
    createdAt: String(source.createdAt || source.created_at || ""),
    updatedAt: String(source.updatedAt || source.updated_at || ""),
  };
}

function mapActivityScore(raw: unknown): ActivityScoreResponse {
  const source = (raw || {}) as Record<string, unknown>;
  const rawSkillScores = Array.isArray(source.skillScores) ? source.skillScores : [];

  const skillScores: SkillScoreItem[] = rawSkillScores.map((item) => {
    const scoreItem = (item || {}) as Record<string, unknown>;
    return {
      skillId: extractId(scoreItem.skillId || scoreItem.skill_id),
      requiredLevel: String(scoreItem.requiredLevel || scoreItem.required_level || "LOW").toUpperCase() as
        | "LOW"
        | "MEDIUM"
        | "HIGH"
        | "EXPERT",
      weight: Number(scoreItem.weight || 0),
      employeeDynamicScore: Number(scoreItem.employeeDynamicScore || scoreItem.employee_dynamic_score || 0),
      contribution: Number(scoreItem.contribution || 0),
    };
  });

  return {
    activityId: extractId(source.activityId || source.activity_id),
    employeeId: extractId(source.employeeId || source.employee_id),
    weightedScore: Number(source.weightedScore || source.weighted_score || 0),
    weightTotal: Number(source.weightTotal || source.weight_total || 0),
    globalScore: Number(source.globalScore || source.global_score || 0),
    skillScores,
  };
}

export async function addSkillToActivity(
  activityId: string,
  skillId: string,
  requiredLevel: "LOW" | "MEDIUM" | "HIGH" | "EXPERT" = "MEDIUM",
  weight: number = 1
): Promise<ActivitySkillRecord> {
  const payload = {
    skill_id: skillId,
    required_level: requiredLevel,
    weight: Math.max(0, Math.min(1, weight)),
  };

  const res = await fetch(`${BASE}/activities/${activityId}/skills`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handle(res);
  return data;
}

export async function getActivitySkills(activityId: string): Promise<ActivitySkillRecord[]> {
  const res = await fetch(`${BASE}/activities/${activityId}/skills`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await handle(res);
  return Array.isArray(data) ? data : [];
}

export async function enrollInActivity(
  activityId: string,
  employeeId?: string
): Promise<Record<string, unknown>> {
  const payload = employeeId ? { employee_id: employeeId } : undefined;
  const activity = encodeURIComponent(activityId);

  const data = await requestWithFallback(
    [
      `/activities/${activity}/enroll`,
      `/activity/${activity}/enroll`,
      `/activities/${activity}/enrollment`,
    ],
    {
      method: "POST",
      headers: authHeaders(),
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    }
  );
  return (data || {}) as Record<string, unknown>;
}

export async function updateParticipationStatus(
  activityId: string,
  employeeId: string,
  status: ParticipationStatus
): Promise<ActivityParticipationRecord> {
  const activity = encodeURIComponent(activityId);
  const employee = encodeURIComponent(employeeId);

  const data = await requestWithFallback(
    [
      `/activities/${activity}/participations/${employee}/status`,
      `/activity/${activity}/participations/${employee}/status`,
      `/activities/${activity}/participation/${employee}/status`,
      `/activity/${activity}/participation/${employee}/status`,
    ],
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    }
  );
  return mapParticipation(data);
}

export async function getActivityParticipations(
  activityId: string,
  status?: ParticipationStatus | "ALL"
): Promise<ActivityParticipationRecord[]> {
  const activity = encodeURIComponent(activityId);
  const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";

  const data = await requestWithFallback(
    [
      `/activities/${activity}/participations${query}`,
      `/activity/${activity}/participations${query}`,
      `/activities/${activity}/participation${query}`,
      `/activity/${activity}/participation${query}`,
    ],
    {
      method: "GET",
      headers: authHeaders(),
    }
  );
  const rows = Array.isArray(data) ? data : [];
  return rows.map(mapParticipation).filter((row) => !!row.employeeId);
}

export async function getActivityScoreForEmployee(
  activityId: string,
  employeeId: string
): Promise<ActivityScoreResponse> {
  const activity = encodeURIComponent(activityId);
  const employee = encodeURIComponent(employeeId);

  const data = await requestWithFallback(
    [
      `/activities/${activity}/score/${employee}`,
      `/activity/${activity}/score/${employee}`,
      `/activities/${activity}/scores/${employee}`,
      `/activity/${activity}/scores/${employee}`,
    ],
    {
      method: "GET",
      headers: authHeaders(),
    }
  );
  return mapActivityScore(data);
}

export async function updateActivitySkill(
  activityId: string,
  skillId: string,
  patch: { required_level?: "LOW" | "MEDIUM" | "HIGH" | "EXPERT"; weight?: number }
): Promise<ActivitySkillRecord> {
  const res = await fetch(`${BASE}/activities/${activityId}/skills/${skillId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });

  const data = await handle(res);
  return data;
}

export async function removeSkillFromActivity(activityId: string, skillId: string): Promise<void> {
  const res = await fetch(`${BASE}/activities/${activityId}/skills/${skillId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  await handle(res);
}

// ==================== Available Skills ====================

export type Skill = {
  _id: string;
  name: string;
  category: "KNOWLEDGE" | "KNOW_HOW" | "SOFT";
  description?: string;
};

export async function listSkills(): Promise<Skill[]> {
  const res = await fetch(`${BASE}/skills`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await handle(res);
  return Array.isArray(data) ? data : [];
}
