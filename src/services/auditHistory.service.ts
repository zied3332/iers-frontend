import axios from "axios";
import { getApiBaseUrl } from "../utils/apiBaseUrl";

const API_URL = getApiBaseUrl();

export type AuditHistoryRow = {
  _id: string;
  subjectUserId: string;
  actorUserId: string;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type AuditHistoryPageResult = {
  items: AuditHistoryRow[];
  total: number;
  limit: number;
  skip: number;
};

function authHeaders(): Record<string, string> {
  const raw =
    localStorage.getItem("token") || localStorage.getItem("access_token");
  const token = String(raw || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type HistoryPeriod = "all" | "week" | "month";

export async function fetchMyAuditHistory(params?: {
  limit?: number;
  skip?: number;
  q?: string;
  period?: HistoryPeriod;
}): Promise<AuditHistoryPageResult> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.skip != null) search.set("skip", String(params.skip));
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.period && params.period !== "all") search.set("period", params.period);
  const q = search.toString();
  const url = `${API_URL}/audit-history/me${q ? `?${q}` : ""}`;
  const res = await axios.get<AuditHistoryPageResult>(url, {
    headers: authHeaders(),
  });
  return res.data;
}
