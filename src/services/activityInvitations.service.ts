import axios from "axios";
import type {
  ActivityInvitationsResponse,
  ActivityStaffingStatusResponse,
  CreateInvitationsPayload,
  EmployeeInvitationDetailResponse,
  EmployeeInvitationListItem,
  InvitationResponsePayload,
  NextBackupsResponse,
  ReplaceInvitationPayload,
} from "../types/activity-invitations";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders(): Record<string, string> {
  const raw =
    localStorage.getItem("token") || localStorage.getItem("access_token");
  const token = String(raw || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createInvitations(payload: CreateInvitationsPayload) {
  const res = await axios.post(`${API_URL}/activity-invitations`, payload);
  return res.data;
}

export async function getMyInvitations(): Promise<EmployeeInvitationListItem[]> {
  const res = await axios.get<EmployeeInvitationListItem[]>(
    `${API_URL}/activity-invitations/employee/me`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function getMyInvitationDetail(
  invitationId: string
): Promise<EmployeeInvitationDetailResponse> {
  const res = await axios.get<EmployeeInvitationDetailResponse>(
    `${API_URL}/activity-invitations/employee/me/${encodeURIComponent(invitationId)}`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function respondToInvitation(
  invitationId: string,
  payload: InvitationResponsePayload
) {
  const res = await axios.patch(
    `${API_URL}/activity-invitations/${encodeURIComponent(invitationId)}/respond`,
    payload,
    { headers: { "Content-Type": "application/json", ...authHeaders() } }
  );
  return res.data;
}

export async function replaceDeclinedInvitation(
  payload: ReplaceInvitationPayload
) {
  const res = await axios.patch(
    `${API_URL}/activity-invitations/replace`,
    payload,
    {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    }
  );
  return res.data;
}

export async function getActivityInvitations(activityId: string) {
  const res = await axios.get<ActivityInvitationsResponse>(
    `${API_URL}/activity-invitations/activity/${activityId}`
  );
  return res.data;
}

export async function getActivityStaffingStatus(activityId: string) {
  const res = await axios.get<ActivityStaffingStatusResponse>(
    `${API_URL}/activity-invitations/activity/${activityId}/status`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function getNextBackupCandidates(
  activityId: string,
  limit = 5
) {
  const res = await axios.get<NextBackupsResponse>(
    `${API_URL}/activity-invitations/activity/${activityId}/next-backups?limit=${limit}`,
    { headers: authHeaders() }
  );
  return res.data;
}