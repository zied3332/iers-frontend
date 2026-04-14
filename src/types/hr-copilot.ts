export type ActivityItem = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  domain?: string;
  score?: number;
};

export type CandidateItem = {
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
};

export type ChatSearchResponse = {
  intent: string;
  message?: string;
  data?: {
    activities?: ActivityItem[];
    debug?: any;
  };
  sessionId?: string;
  sessionState?: {
    sessionId?: string;
    [key: string]: any;
  };
};

export type CandidatesResponse = {
  type: "candidates_list";
  activityId: string;
  activityTitle: string;
  seatsRequired: number;
  primaryCount: number;
  backupCount: number;
  totalRecommended: number;
  primaryCandidates: CandidateItem[];
  backupCandidates: CandidateItem[];
};

export type ExplanationResponse = {
  type?: string;
  activityId?: string;
  activityTitle?: string;
  employeeId?: string;
  candidate?: CandidateItem;
  explanation?: string[];
  message?: string;
};