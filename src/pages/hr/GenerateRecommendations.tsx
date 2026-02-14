import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Activity = {
  id: string;
  title: string;
  department: string;
  seats: number;
  requiredSkills: { name: string; desiredLevel: "LOW" | "MEDIUM" | "HIGH" }[];
};

type Candidate = {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  globalScore: number;
  skills: { name: string; level: "LOW" | "MEDIUM" | "HIGH" }[];
  yearsExp: number;
};

type GeneratedRec = Candidate & {
  score: number;
  skillMatch: number;
  experienceScore: number;
  contextBoost: number;
};

const activities: Activity[] = [
  {
    id: "A-1",
    title: "Advanced React Training",
    department: "IT",
    seats: 5,
    requiredSkills: [
      { name: "React", desiredLevel: "MEDIUM" },
      { name: "TypeScript", desiredLevel: "LOW" },
    ],
  },
  {
    id: "A-2",
    title: "Cloud Architecture Bootcamp",
    department: "Engineering",
    seats: 8,
    requiredSkills: [
      { name: "Cloud", desiredLevel: "MEDIUM" },
      { name: "Networking", desiredLevel: "LOW" },
    ],
  },
  {
    id: "A-3",
    title: "Data Storytelling Workshop",
    department: "Marketing",
    seats: 10,
    requiredSkills: [
      { name: "Analytics", desiredLevel: "LOW" },
      { name: "Communication", desiredLevel: "MEDIUM" },
    ],
  },
];

const candidates: Candidate[] = [
  {
    employeeId: "E-102",
    name: "John Doe",
    department: "IT",
    position: "Lead Software Engineer",
    globalScore: 88,
    yearsExp: 6,
    skills: [
      { name: "React", level: "HIGH" },
      { name: "TypeScript", level: "MEDIUM" },
      { name: "Java", level: "MEDIUM" },
    ],
  },
  {
    employeeId: "E-203",
    name: "Sarah Anderson",
    department: "Engineering",
    position: "Java Developer",
    globalScore: 81,
    yearsExp: 4,
    skills: [
      { name: "Cloud", level: "MEDIUM" },
      { name: "Networking", level: "LOW" },
      { name: "Spring Boot", level: "HIGH" },
    ],
  },
  {
    employeeId: "E-311",
    name: "Mark Smith",
    department: "Marketing",
    position: "Growth Specialist",
    globalScore: 76,
    yearsExp: 5,
    skills: [
      { name: "Analytics", level: "MEDIUM" },
      { name: "Communication", level: "HIGH" },
      { name: "SEO", level: "MEDIUM" },
    ],
  },
  {
    employeeId: "E-145",
    name: "Alice Smith",
    department: "IT",
    position: "Backend Developer",
    globalScore: 84,
    yearsExp: 3,
    skills: [
      { name: "React", level: "MEDIUM" },
      { name: "Node", level: "MEDIUM" },
      { name: "SQL", level: "HIGH" },
    ],
  },
];

const levelValue = (lvl: "LOW" | "MEDIUM" | "HIGH") =>
  lvl === "HIGH" ? 3 : lvl === "MEDIUM" ? 2 : 1;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function HrGenerateRecommendations() {
  const [activityId, setActivityId] = useState(activities[0].id);
  const [department, setDepartment] = useState<string>("ALL");
  const [skillQuery, setSkillQuery] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [topN, setTopN] = useState(5);

  // weights
  const [wSkill, setWSkill] = useState(0.55);
  const [wExp, setWExp] = useState(0.35);
  const [wCtx, setWCtx] = useState(0.10);

  const [generated, setGenerated] = useState<GeneratedRec[] | null>(null);

  const activity = useMemo(
    () => activities.find((a) => a.id === activityId)!,
    [activityId]
  );

  const pool = useMemo(() => {
    return candidates
      .filter((c) => c.globalScore >= minScore)
      .filter((c) => (department === "ALL" ? true : c.department === department))
      .filter((c) => {
        if (!skillQuery.trim()) return true;
        const q = skillQuery.toLowerCase();
        return c.skills.some((s) => s.name.toLowerCase().includes(q));
      });
  }, [department, minScore, skillQuery]);

  const generate = () => {
    // simple fake scoring
    const req = activity.requiredSkills;

    const scored: GeneratedRec[] = pool.map((c) => {
      let matched = 0;
      let total = req.length;

      req.forEach((r) => {
        const found = c.skills.find(
          (s) => s.name.toLowerCase() === r.name.toLowerCase()
        );
        if (!found) return;
        if (levelValue(found.level) >= levelValue(r.desiredLevel)) matched++;
        else matched += 0.5; // partial match
      });

      const skillMatch = clamp(Math.round((matched / Math.max(total, 1)) * 100), 0, 100);
      const experienceScore = clamp(Math.round((c.yearsExp / 8) * 100), 0, 100);
      const contextBoost = department !== "ALL" && c.department === department ? 6 : 3;

      const score = clamp(
        Math.round(
          wSkill * skillMatch + wExp * experienceScore + wCtx * (contextBoost * 10)
        ),
        0,
        100
      );

      return { ...c, score, skillMatch, experienceScore, contextBoost };
    });

    scored.sort((a, b) => b.score - a.score);
    setGenerated(scored.slice(0, topN));
  };

  return (
    <div className="hr-page">
      <div className="hr-topbar">
        <div>
          <div className="header-title">Generate Recommendations</div>
          <div className="header-sub">
            Choose an activity + filters, then generate a ranked candidate list.
          </div>
        </div>

        <div className="hr-actions">
          <Link className="btn btn-ghost" to="/hr/recommendations">
            Back
          </Link>
          <button className="btn btn-primary" onClick={generate}>
            Generate
          </button>
        </div>
      </div>

      <div className="hr-grid">
        {/* LEFT: INPUTS */}
        <div>
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Inputs</div>
              <span className="badge">Mock</span>
            </div>

            <div className="stack">
              <div>
                <div className="meta">Activity</div>
                <select
                  className="btn w-full"
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} • seats {a.seats}
                    </option>
                  ))}
                </select>
              </div>

              <div className="two-cols">
                <div>
                  <div className="meta">Department</div>
                  <select
                    className="btn w-full"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="ALL">ALL</option>
                    <option value="IT">IT</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <div className="meta">Top N</div>
                  <input
                    className="btn w-full"
                    type="number"
                    min={1}
                    max={20}
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="two-cols">
                <div>
                  <div className="meta">Min Global Score: {minScore}</div>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={100}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div className="meta">Skill Filter</div>
                  <input
                    className="btn w-full"
                    placeholder="ex: React, Cloud..."
                    value={skillQuery}
                    onChange={(e) => setSkillQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div className="section-title">Scoring Weights</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Demo only — backend will calculate the real score later.
                </div>

                <div className="stack" style={{ marginTop: 10 }}>
                  <div>
                    <div className="meta">Skill Match: {(wSkill * 100).toFixed(0)}%</div>
                    <input
                      className="w-full"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={wSkill}
                      onChange={(e) => setWSkill(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="meta">
                      Experience: {(wExp * 100).toFixed(0)}%
                    </div>
                    <input
                      className="w-full"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={wExp}
                      onChange={(e) => setWExp(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="meta">Context: {(wCtx * 100).toFixed(0)}%</div>
                    <input
                      className="w-full"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={wCtx}
                      onChange={(e) => setWCtx(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div className="section-title">Activity Requirements</div>
                <div className="tags">
                  {activity.requiredSkills.map((s) => (
                    <span key={s.name} className="tag">
                      {s.name} • {s.desiredLevel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: OUTPUT */}
        <div className="hr-right">
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Preview</div>
              <span className="badge">Top {topN}</span>
            </div>

            {!generated ? (
              <p className="muted">
                Click <b>Generate</b> to preview ranked candidates.
              </p>
            ) : (
              <div className="stack">
                {generated.map((r) => (
                  <div key={r.employeeId} className="history-item">
                    <div style={{ display: "grid", gap: 4 }}>
                      <div className="history-title">
                        {r.name}{" "}
                        <span className="meta">
                          ({r.department}) • {r.position}
                        </span>
                      </div>

                      <div className="tags">
                        <span className="tag">Skill: {r.skillMatch}%</span>
                        <span className="tag">Exp: {r.experienceScore}%</span>
                        <span className="tag">Ctx: +{r.contextBoost}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="score-value">{r.score}%</div>
                      <button className="btn btn-small btn-primary">
                        Add
                      </button>
                    </div>
                  </div>
                ))}

                <button className="btn btn-primary w-full">
                  Save batch (mock)
                </button>
              </div>
            )}
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">What happens next?</div>
            </div>
            <p className="muted">
              After saving a batch, HR can review it in{" "}
              <b>/hr/recommendations</b>, approve/reject, then send invitations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}