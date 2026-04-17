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
  employeeName?: string;
  status: InvitationStatus;
  declineReason?: string;
  invitedAt?: string;
  responseDeadlineAt?: string;
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
  replacementResponseDays?: number;
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
  /** Accepted + pending people minus seats when over capacity */
  overOpenInvites?: number;
  hrInvitationResponseDays?: number | null;
  managerReplacementResponseDays?: number | null;
  invitations: ActivityInvitationItem[];
};

export type EmployeeInvitationListItem = {
  _id: string;
  activityId: string;
  employeeId: string;
  status: InvitationStatus;
  declineReason?: string;
  invitedAt?: string;
  responseDeadlineAt?: string;
  respondedAt?: string;
  hrNote?: string;
  activityTitle: string;
  activityType: string;
  activityLocation: string;
  activityStartDate?: string;
  activityEndDate?: string;
};

export type EmployeeInvitationActivityDetail = {
  _id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  startDate: string;
  endDate: string;
  duration: string;
  seats: number;
  status: string;
  workflowStatus: string;
  context: string;
  priority_level: string;
};

export type EmployeeInvitationDetailResponse = {
  invitation: {
    _id: string;
    activityId: string;
    employeeId: string;
    status: InvitationStatus;
    declineReason: string;
    invitedAt?: string;
    responseDeadlineAt?: string;
    respondedAt?: string;
    hrNote: string;
  };
  activity: EmployeeInvitationActivityDetail;
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