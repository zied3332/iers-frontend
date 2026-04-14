export type InvitationStatus =
  | "INVITED"
  | "ACCEPTED"
  | "DECLINED"
  | "REPLACED"
  | "CANCELLED";

export type ActivityInvitationItem = {
  _id?: string;
  id?: string;
  activityId: string;
  employeeId: string;
  status: InvitationStatus;
  declineReason?: string;
  invitedAt?: string;
  respondedAt?: string;
  replacedAt?: string;
  invitedBy?: string;
  replacedFromInvitationId?: string;
  hrNote?: string;
};

export type CreateInvitationsPayload = {
  activityId: string;
  employeeIds: string[];
  hrNote?: string;
};

export type InvitationResponsePayload = {
  status: "ACCEPTED" | "DECLINED";
  declineReason?: string;
};

export type ReplaceInvitationPayload = {
  declinedInvitationId: string;
  replacementEmployeeId: string;
};

export type ActivityInvitationsResponse = ActivityInvitationItem[];

export type ActivityStaffingStatusResponse = {
  activityId: string;
  activityTitle: string;
  seatsRequired: number;
  accepted: number;
  invited: number;
  declined: number;
  replaced: number;
  filledSeats: number;
  reservedSeats: number;
  emptySeats: number;
  invitations: ActivityInvitationItem[];
};

export type NextBackupsResponse = {
  activityId: string;
  activityTitle: string;
  availableBackups: Array<{
    employeeId: string;
    name: string;
    semanticScore: number;
    skillScore: number;
    progressionScore: number;
    experienceScore: number;
    finalScore: number;
    matchedSkills: string[];
    shortReason: string;
    recommendationType?: "PRIMARY" | "BACKUP";
    rank?: number;
  }>;
};