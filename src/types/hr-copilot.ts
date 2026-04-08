export type ActivityItem = {
  id: string;
  title: string;
  type?: string;
  domain?: string;
  description?: string;
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
};

export type ChatSearchResponse = {
  intent?: string;
  type?: string;
  sessionId?: string;
  message?: string;
  data?: any;
  sessionState?: {
    sessionId?: string;
    selectedActivityId?: string | null;
    selectedActivityTitle?: string | null;
    lastActivityResults?: string[];
    lastCandidateResults?: string[];
    lastIntent?: string;
    activeFilters?: {
      domain?: string;
      period?: string;
      department?: string;
      level?: string;
      activityType?: string;
      objective?: string;
      keywords?: string[];
    };
  };
};

export type CandidatesResponse = {
  type?: string;
  activityId?: string;
  count?: number;
  candidates: CandidateItem[];
};

export type ExplanationResponse = {
  type?: string;
  sessionId?: string;
  candidate?: CandidateItem;
  explanation?: string[];
  message?: string;
};