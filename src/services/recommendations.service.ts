import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export type RecommendationDecision =
  | "RECOMMENDED"
  | "POSSIBLE_WITH_GAP"
  | "NOT_RECOMMENDED";

export type RecommendationItem = {
  employeeId: string;
  fullName: string;
  email: string;
  rank: number;
  finalScore: number;
  decision: RecommendationDecision;
  selectionGroup: "PRIMARY" | "BACKUP" | "NOT_RECOMMENDED";
  explanation: string;
  strengths: string[];
  risks: string[];
  nextAction: string;
  breakdown: {
    skillMatch: number;
    contextFit: number;
    experienceFit: number;
    historyFit: number;
  };
};

export type RecommendationFinalResponse = {
  activityId: string;
  seats: number;
  backupCount: number;
  summary: {
    totalCandidates: number;
    primaryCount: number;
    backupCount: number;
    notRecommendedCount: number;
    recommended: number;
    possibleWithGap: number;
    notRecommended: number;
  };
  primaryCandidates: RecommendationItem[];
  backupCandidates: RecommendationItem[];
  notRecommendedCandidates: RecommendationItem[];
};

export async function getFinalRecommendations(activityId: string) {
  const res = await axios.get<RecommendationFinalResponse>(
    `${API_URL}/activities/${activityId}/recommendation-final`,
    authHeaders()
  );

  return res.data;
}