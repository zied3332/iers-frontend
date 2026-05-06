export type DailyAttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type AttendanceMap = Record<string, Record<string, DailyAttendanceStatus>>;

export type MonitorDraft = {
  attendanceByParticipant: AttendanceMap;
  dayNotes: Record<string, string>;
  finalReport: string;
  updatedAt?: string;
};

import { getApiBaseUrl } from "../utils/apiBaseUrl";

const STORAGE_PREFIX = "manager_activity_monitor_v1";
const API_URL = getApiBaseUrl();

function storageKey(activityId: string) {
  return `${STORAGE_PREFIX}:${activityId}`;
}

const DEFAULT_DRAFT: MonitorDraft = {
  attendanceByParticipant: {},
  dayNotes: {},
  finalReport: "",
};

function hasWindow() {
  return typeof window !== "undefined" && !!window.localStorage;
}

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

function getTodayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pickTodayAttendancePatch(
  attendance?: AttendanceMap
): AttendanceMap | undefined {
  if (!attendance) return undefined;
  const todayKey = getTodayKey();
  const out: AttendanceMap = {};
  Object.entries(attendance).forEach(([employeeId, byDay]) => {
    const v = byDay?.[todayKey];
    if (v) out[employeeId] = { [todayKey]: v };
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

export function buildDateRange(start?: string, end?: string): string[] {
  if (!start || !end) return [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
  if (startDate > endDate) return [];

  const days: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function getMonitorDraft(activityId: string): MonitorDraft {
  if (!activityId || !hasWindow()) return { ...DEFAULT_DRAFT };
  try {
    const raw = window.localStorage.getItem(storageKey(activityId));
    if (!raw) return { ...DEFAULT_DRAFT };
    const parsed = JSON.parse(raw) as Partial<MonitorDraft>;
    return {
      attendanceByParticipant: parsed.attendanceByParticipant || {},
      dayNotes: parsed.dayNotes || {},
      finalReport: parsed.finalReport || "",
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { ...DEFAULT_DRAFT };
  }
}

export function saveMonitorDraft(activityId: string, patch: Partial<MonitorDraft>) {
  if (!activityId || !hasWindow()) return;
  const current = getMonitorDraft(activityId);
  const next: MonitorDraft = {
    attendanceByParticipant:
      patch.attendanceByParticipant || current.attendanceByParticipant,
    dayNotes: patch.dayNotes || current.dayNotes,
    finalReport:
      patch.finalReport !== undefined ? patch.finalReport : current.finalReport,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(storageKey(activityId), JSON.stringify(next));
}

export async function getMonitorDraftWithServer(
  activityId: string
): Promise<MonitorDraft> {
  const local = getMonitorDraft(activityId);
  try {
    const res = await fetch(
      `${API_URL}/activities/${encodeURIComponent(activityId)}/manager-monitor-draft`,
      {
        method: "GET",
        headers: authHeaders(),
      }
    );
    if (!res.ok) return local;
    const remote = (await res.json()) as Partial<MonitorDraft> & {
      attendanceByParticipant?: AttendanceMap;
      dayNotes?: Record<string, string>;
      finalReport?: string;
      updatedAt?: string;
    };
    const merged: MonitorDraft = {
      attendanceByParticipant: remote.attendanceByParticipant || local.attendanceByParticipant || {},
      dayNotes: remote.dayNotes || local.dayNotes || {},
      finalReport:
        typeof remote.finalReport === "string" ? remote.finalReport : local.finalReport || "",
      updatedAt: remote.updatedAt || local.updatedAt,
    };
    saveMonitorDraft(activityId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveMonitorDraftWithServer(
  activityId: string,
  patch: Partial<MonitorDraft>
): Promise<MonitorDraft> {
  saveMonitorDraft(activityId, patch);
  const local = getMonitorDraft(activityId);
  const attendancePatch = pickTodayAttendancePatch(patch.attendanceByParticipant);
  try {
    const res = await fetch(
      `${API_URL}/activities/${encodeURIComponent(activityId)}/manager-monitor-draft`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          attendanceByParticipant: attendancePatch,
          dayNotes: patch.dayNotes,
          finalReport: patch.finalReport,
        }),
      }
    );
    if (!res.ok) return local;
    const body = (await res.json()) as { draft?: MonitorDraft };
    const next = body?.draft || local;
    saveMonitorDraft(activityId, next);
    return next;
  } catch {
    return local;
  }
}

export function ensureAttendanceMap(
  participantIds: string[],
  days: string[],
  existing?: AttendanceMap
): AttendanceMap {
  const out: AttendanceMap = { ...(existing || {}) };
  participantIds.forEach((participantId) => {
    const byDay = { ...(out[participantId] || {}) };
    days.forEach((day) => {
      if (!byDay[day]) byDay[day] = "PRESENT";
    });
    out[participantId] = byDay;
  });
  return out;
}
