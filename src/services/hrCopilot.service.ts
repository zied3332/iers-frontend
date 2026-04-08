import axios from "axios";
import type {
  CandidatesResponse,
  ChatSearchResponse,
  ExplanationResponse,
} from "../types/hr-copilot";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function searchActivities(message: string, sessionId?: string) {
  const res = await axios.post<ChatSearchResponse>(`${API_URL}/chat/message`, {
    message,
    sessionId,
  });
  return res.data;
}

export async function getCandidates(activityId: string, count = 5) {
  const res = await axios.get<CandidatesResponse>(
    `${API_URL}/recommendation/${activityId}/candidates?count=${count}`
  );
  return res.data;
}

export async function explainCandidate(
  activityId: string,
  employeeId: string
) {
  const res = await axios.get<ExplanationResponse>(
    `${API_URL}/recommendation/${activityId}/explain/${employeeId}`
  );
  return res.data;
}