import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HrCopilotPage.css";
import type { ActivityItem, CandidateItem } from "../../types/hr-copilot";
import {
  explainCandidate,
  getCandidates,
  searchActivities,
} from "../../services/hrCopilot.service";

type CandidateGroupMessage = {
  id: string;
  role: "assistant";
  type: "candidate_groups";
  content: string;
  activityId: string;
  activityTitle: string;
  seatsRequired: number;
  primaryCandidates: CandidateItem[];
  backupCandidates: CandidateItem[];
};

type ChatMessage =
  | {
      id: string;
      role: "user";
      type: "text";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      type: "text";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      type: "activities";
      content: string;
      activities: ActivityItem[];
    }
  | CandidateGroupMessage
  | {
      id: string;
      role: "assistant";
      type: "explanation";
      content: string[];
      candidateName: string;
    };

export default function HrCopilotPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("List IT activities for backend developers");
  const [sessionId, setSessionId] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-message",
      role: "assistant",
      type: "text",
      content:
        "Hello, I’m your HR Copilot. Ask me to find activities, rank candidates, and explain why a candidate matches an activity.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    "List cloud training activities",
    "Find backend upskilling activities",
    "Search AI certifications for data team",
    "Show DevOps activities from this quarter",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingSearch, loadingCandidates, loadingExplanation]);

  const createId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const handleSearch = async () => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      setError("Please enter a request first.");
      return;
    }

    try {
      setError("");
      setLoadingSearch(true);
      setSelectedActivity(null);
      setSelectedCandidate(null);
      setExplanation([]);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "user",
          type: "text",
          content: cleanedQuery,
        },
      ]);

      const response = await searchActivities(cleanedQuery, sessionId || undefined);

      const nextSessionId =
        response.sessionId || response.sessionState?.sessionId || "";
      if (nextSessionId) {
        setSessionId(nextSessionId);
      }

      const rawActivities = Array.isArray(response.data?.activities)
        ? response.data.activities
        : Array.isArray(response.data)
        ? response.data
        : [];

      const normalizedActivities: ActivityItem[] = rawActivities.map((activity: any) => ({
        id: activity.id || activity._id || "",
        title: activity.title || "Untitled activity",
        type: activity.type || "",
        domain: activity.domain || activity.category || "",
        description: activity.description || activity.objective || "",
        score: activity.score || activity.matchScore,
      }));

      setActivities(normalizedActivities);

      if (normalizedActivities.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            type: "text",
            content:
              "I couldn’t find matching activities for that request. Try rephrasing it with a domain, skill, or activity type.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            type: "activities",
            content: "I found these matching activities. Select one to open recommendations.",
            activities: normalizedActivities,
          },
        ]);
      }

      setQuery("");
    } catch (err: any) {
      console.error("Search error:", err);
      const message =
        err?.response?.data?.message || "Failed to search activities.";
      setError(message);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          type: "text",
          content: message,
        },
      ]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectActivity = async (activity: ActivityItem) => {
    try {
      setError("");
      setLoadingCandidates(true);
      setSelectedActivity(activity);
      setSelectedCandidate(null);
      setExplanation([]);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "user",
          type: "text",
          content: `Select activity: ${activity.title}`,
        },
      ]);

      const data = await getCandidates(activity.id);

      const primaryCandidates = data.primaryCandidates || [];
      const backupCandidates = data.backupCandidates || [];
      const totalCandidates = primaryCandidates.length + backupCandidates.length;

      if (totalCandidates === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            type: "text",
            content: `No candidates were found for "${activity.title}". Try another activity.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            type: "candidate_groups",
            content: `I prepared ${data.totalRecommended} recommendations for "${data.activityTitle}".`,
            activityId: data.activityId,
            activityTitle: data.activityTitle,
            seatsRequired: data.seatsRequired,
            primaryCandidates,
            backupCandidates,
          },
        ]);
      }
    } catch (err: any) {
      console.error("Candidates error:", err);
      const message =
        err?.response?.data?.message || "Failed to load candidates.";
      setError(message);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          type: "text",
          content: message,
        },
      ]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleExplain = async (
    activityId: string,
    activityTitle: string,
    candidate: CandidateItem
  ) => {
    try {
      setError("");
      setLoadingExplanation(true);
      setSelectedCandidate(candidate);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "user",
          type: "text",
          content: `Explain why ${candidate.name} is a good match for ${activityTitle}`,
        },
      ]);

      const data = await explainCandidate(activityId, candidate.employeeId);

      const explanationItems = data.explanation || [];
      setExplanation(explanationItems);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          type: "explanation",
          content:
            explanationItems.length > 0
              ? explanationItems
              : ["No detailed explanation was returned by the service."],
          candidateName: candidate.name,
        },
      ]);
    } catch (err: any) {
      console.error("Explanation error:", err);
      const message =
        err?.response?.data?.message || "Failed to load explanation.";
      setError(message);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          type: "text",
          content: message,
        },
      ]);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
  };

  const handleOpenStaffing = (activityId: string) => {
    navigate(`/hr/activities/${activityId}/staffing`);
  };

  const renderCandidateCard = (
    candidate: CandidateItem,
    index: number,
    activityId: string,
    activityTitle: string
  ) => {
    return (
      <div
        key={candidate.employeeId}
        className={`chat-card candidate-card ${
          selectedCandidate?.employeeId === candidate.employeeId
            ? "is-active"
            : ""
        }`}
      >
        <div className="candidate-top">
          <div className="candidate-avatar">
            {candidate.name?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="candidate-main">
            <div className="candidate-headline">
              <div>
                <h4>{candidate.name}</h4>
                <span className="chat-pill">
                  Rank #{candidate.rank ?? index + 1}
                </span>
              </div>
              <div className="candidate-score">{candidate.finalScore}/100</div>
            </div>

            <p>{candidate.shortReason}</p>
          </div>
        </div>

        <div className="candidate-metrics">
          <span>
            Semantic <strong>{candidate.semanticScore}</strong>
          </span>
          <span>
            Skills <strong>{candidate.skillScore}</strong>
          </span>
          <span>
            Progression <strong>{candidate.progressionScore}</strong>
          </span>
          <span>
            Experience <strong>{candidate.experienceScore}</strong>
          </span>
        </div>

        <div className="candidate-actions">
          <button
            type="button"
            className="chat-secondary-btn"
            onClick={() => setSelectedCandidate(candidate)}
          >
            Open profile
          </button>

          <button
            type="button"
            className="chat-action-btn"
            onClick={() => handleExplain(activityId, activityTitle, candidate)}
            disabled={loadingExplanation}
          >
            {loadingExplanation &&
            selectedCandidate?.employeeId === candidate.employeeId
              ? "Explaining..."
              : "Explain ranking"}
          </button>
        </div>
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === "text") {
      return (
        <div
          key={message.id}
          className={`chat-message-row ${
            message.role === "user" ? "user-row" : "assistant-row"
          }`}
        >
          <div
            className={`chat-bubble ${
              message.role === "user" ? "user-bubble" : "assistant-bubble"
            }`}
          >
            <p>{message.content}</p>
          </div>
        </div>
      );
    }

    if (message.type === "activities") {
      return (
        <div key={message.id} className="chat-message-row assistant-row">
          <div className="chat-bubble assistant-bubble rich-bubble">
            <p className="bubble-title">{message.content}</p>

            <div className="chat-card-list">
              {message.activities.map((activity, index) => (
                <div
                  key={activity.id || `${activity.title}-${index}`}
                  className={`chat-card activity-card ${
                    selectedActivity?.id === activity.id ? "is-active" : ""
                  }`}
                >
                  <div className="chat-card-header">
                    <span className="chat-card-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {activity.type ? (
                      <span className="chat-badge">{activity.type}</span>
                    ) : null}
                  </div>

                  <h4>{activity.title}</h4>
                  <p>{activity.description || "No description available."}</p>

                  <div className="chat-card-meta">
                    {activity.domain ? (
                      <span className="chat-pill">{activity.domain}</span>
                    ) : null}
                    {typeof activity.score === "number" ? (
                      <span className="chat-pill">Score {activity.score}</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="chat-action-btn"
                    onClick={() => handleSelectActivity(activity)}
                    disabled={loadingCandidates}
                  >
                    {loadingCandidates && selectedActivity?.id === activity.id
                      ? "Loading..."
                      : "Select activity"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (message.type === "candidate_groups") {
      return (
        <div key={message.id} className="chat-message-row assistant-row">
          <div className="chat-bubble assistant-bubble rich-bubble">
            <div className="candidate-group-header">
              <div>
                <p className="bubble-title">{message.content}</p>
                <div className="chat-card-meta">
                  <span className="chat-pill">
                    Seats required: {message.seatsRequired}
                  </span>
                  <span className="chat-pill">
                    Primary: {message.primaryCandidates.length}
                  </span>
                  <span className="chat-pill">
                    Backup: {message.backupCandidates.length}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="chat-action-btn"
                onClick={() => handleOpenStaffing(message.activityId)}
              >
                Manage staffing
              </button>
            </div>

            <div className="candidate-group-block">
              <h3 className="candidate-group-title">Primary recommendations</h3>
              <div className="chat-card-list">
                {message.primaryCandidates.length === 0 ? (
                  <div className="chat-card">
                    <p>No primary candidates found.</p>
                  </div>
                ) : (
                  message.primaryCandidates.map((candidate, index) =>
                    renderCandidateCard(
                      candidate,
                      index,
                      message.activityId,
                      message.activityTitle
                    )
                  )
                )}
              </div>
            </div>

            <div className="candidate-group-block">
              <h3 className="candidate-group-title">Backup recommendations</h3>
              <div className="chat-card-list">
                {message.backupCandidates.length === 0 ? (
                  <div className="chat-card">
                    <p>No backup candidates found.</p>
                  </div>
                ) : (
                  message.backupCandidates.map((candidate, index) =>
                    renderCandidateCard(
                      candidate,
                      index + message.primaryCandidates.length,
                      message.activityId,
                      message.activityTitle
                    )
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (message.type === "explanation") {
      return (
        <div key={message.id} className="chat-message-row assistant-row">
          <div className="chat-bubble assistant-bubble rich-bubble">
            <p className="bubble-title">
              Why {message.candidateName} is a strong match
            </p>

            <ul className="explanation-list">
              {message.content.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="hr-copilot-page single-chat-page">
      <div className="copilot-chat-shell">
        <div className="copilot-chat-header">
          <div className="copilot-brand">
            <div className="copilot-app-mark">AI</div>
            <div>
              <h1>HR Copilot</h1>
              <p>
                Search activities, rank candidates, and get AI explanations in one conversation.
              </p>
            </div>
          </div>

          {sessionId ? (
            <div className="session-badge">Session active</div>
          ) : (
            <div className="session-badge muted">New session</div>
          )}
        </div>

        <div className="copilot-chat-body">
          <div className="quick-prompt-row">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="quick-prompt"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {error ? <div className="copilot-error">{error}</div> : null}

          <div className="chat-messages">
            {messages.map((message) => renderMessage(message))}

            {(loadingSearch || loadingCandidates || loadingExplanation) && (
              <div className="chat-message-row assistant-row">
                <div className="chat-bubble assistant-bubble typing-bubble">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="copilot-chat-input-bar">
          <div className="chat-input-shell">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask the HR Copilot something..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loadingSearch) {
                  handleSearch();
                }
              }}
            />

            <button
              type="button"
              className="send-btn"
              onClick={handleSearch}
              disabled={loadingSearch}
            >
              {loadingSearch ? "Searching..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}