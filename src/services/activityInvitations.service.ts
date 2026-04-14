import axios from "axios";
import type {
  ActivityInvitationsResponse,
  ActivityStaffingStatusResponse,
  CreateInvitationsPayload,
  InvitationResponsePayload,
  NextBackupsResponse,
  ReplaceInvitationPayload,
} from "../types/activity-invitations";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function createInvitations(payload: CreateInvitationsPayload) {
  const res = await axios.post(`${API_URL}/activity-invitations`, payload);
  return res.data;
}

export async function respondToInvitation(
  invitationId: string,
  payload: InvitationResponsePayload
) {
  const res = await axios.patch(
    `${API_URL}/activity-invitations/${invitationId}/respond`,
    payload
  );
  return res.data;
}

export async function replaceDeclinedInvitation(
  payload: ReplaceInvitationPayload
) {
  const res = await axios.patch(
    `${API_URL}/activity-invitations/replace`,
    payload
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
    `${API_URL}/activity-invitations/activity/${activityId}/status`
  );
  return res.data;
}

export async function getNextBackupCandidates(
  activityId: string,
  limit = 5
) {
  const res = await axios.get<NextBackupsResponse>(
    `${API_URL}/activity-invitations/activity/${activityId}/next-backups?limit=${limit}`
  );
  return res.data;
}