import axios from "axios";
import type {
  CandidatesResponse,
  ChatSearchResponse,
  ExplanationResponse,
} from "../types/hr-copilot";
import { getApiBaseUrl } from "../utils/apiBaseUrl";

const API_URL = getApiBaseUrl();

function authHeaders(): Record<string, string> {
  const raw =
    localStorage.getItem("token") || localStorage.getItem("access_token") || "";
  const token = String(raw)
    .replace(/^Bearer\s+/i, "")
    .trim();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function searchActivities(message: string, sessionId?: string) {
  const res = await axios.post<ChatSearchResponse>(
    `${API_URL}/chat/message`,
    { message, sessionId },
    { headers: authHeaders() },
  );
  return res.data;
}

export async function getCandidates(activityId: string) {
  const res = await axios.get<CandidatesResponse>(
    `${API_URL}/recommendation/${activityId}/candidates`,
    { headers: authHeaders() },
  );
  return res.data;
}

export async function explainCandidate(
  activityId: string,
  employeeId: string,
) {
  const res = await axios.get<ExplanationResponse>(
    `${API_URL}/recommendation/${activityId}/explain/${employeeId}`,
    { headers: authHeaders() },
  );
  return res.data;
}
