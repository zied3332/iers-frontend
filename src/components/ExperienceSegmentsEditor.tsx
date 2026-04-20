import React from "react";
import type { ExperienceSegmentInput } from "../utils/experienceSegments";
import {
  hasSegmentOverlap,
  normalizeSegment,
  segmentYears,
  totalSegmentYears,
} from "../utils/experienceSegments";

export type SkillOption = { _id: string; name: string; domainIds: string[] };

function extractIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "_id" in item) return String((item as { _id?: string })._id || "");
      return "";
    })
    .filter(Boolean);
}

export function mapApiSkillsToOptions(raw: unknown): SkillOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => {
      const id = String(item?._id || "").trim();
      if (!id) return null;
      const domainIds = extractIdList(item?.domainIds);
      return {
        _id: id,
        name: String(item?.name || ""),
        domainIds,
      } as SkillOption;
    })
    .filter(Boolean) as SkillOption[];
}

type Props = {
  experienceYears: number;
  segments: ExperienceSegmentInput[];
  onChange: (next: ExperienceSegmentInput[]) => void;
  domains: { _id: string; name: string }[];
  skills: SkillOption[];
  disabled?: boolean;
};

export function mapApiSegmentsToInput(raw: unknown): ExperienceSegmentInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) =>
    normalizeSegment({
      fromYear: Number(item?.fromYear),
      toYear: Number(item?.toYear),
      domainIds: extractIdList(item?.domainIds),
      skillIds: extractIdList(item?.skillIds),
      company: typeof item?.company === 'string' ? item.company : undefined,
    }),
  );
}

export function ExperienceSegmentsEditor({
  experienceYears,
  segments,
  onChange,
  domains,
  skills,
  disabled,
}: Props) {
  const totalYears = totalSegmentYears(segments);
  const overlap = hasSegmentOverlap(segments);
  const sumOk = totalYears === experienceYears;

  const addSegment = () => {
    const y = new Date().getFullYear();
    onChange([...segments, normalizeSegment({ fromYear: y, toYear: y, domainIds: [], skillIds: [] })]);
  };

  const updateSegment = (index: number, patch: Partial<ExperienceSegmentInput>) => {
    const next = segments.map((s, i) => (i === index ? normalizeSegment({ ...s, ...patch }) : s));
    onChange(next);
  };

  const removeSegment = (index: number) => {
    onChange(segments.filter((_, i) => i !== index));
  };

  const skillsForSegment = (segment: ExperienceSegmentInput) => {
    const domainSet = new Set(segment.domainIds);
    if (domainSet.size === 0) return [];
    return skills.filter((sk) => sk.domainIds.some((id) => domainSet.has(id)));
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {experienceYears > 0 && segments.length > 0 && (overlap || !sumOk) && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#b91c1c",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fff1f2",
          }}
        >
          {overlap
            ? "Segments overlap."
            : "Segment years don't match total experience years."}
        </div>
      )}

      {segments.map((segment, index) => {
        const segYears = segmentYears(segment);
        const availableSkills = skillsForSegment(segment);
        return (
          <div
            key={index}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 14,
              background: "var(--surface)",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, color: "var(--text)" }}>Segment {index + 1}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
                Duration: {segYears} {segYears === 1 ? "year" : "years"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>From year</span>
                <input
                  className="input"
                  type="number"
                  disabled={disabled}
                  value={segment.fromYear}
                  onChange={(e) => updateSegment(index, { fromYear: Number(e.target.value || 0) })}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>To year</span>
                <input
                  className="input"
                  type="number"
                  disabled={disabled}
                  value={segment.toYear}
                  onChange={(e) => updateSegment(index, { toYear: Number(e.target.value || 0) })}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
                Company <span style={{ fontWeight: 600, opacity: 0.85 }}>(optional)</span>
              </span>
              <input
                className="input"
                type="text"
                disabled={disabled}
                placeholder="e.g. employer or client name"
                value={segment.company ?? ""}
                onChange={(e) => updateSegment(index, { company: e.target.value })}
                maxLength={120}
              />
            </label>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
                Domains
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  maxHeight: 140,
                  overflowY: "auto",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2, var(--surface))",
                }}
              >
                {domains.length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>No domains loaded.</span>
                ) : (
                  domains.map((d) => {
                    const checked = segment.domainIds.includes(d._id);
                    return (
                      <label
                        key={d._id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={checked}
                          onChange={(e) => {
                            const nextDomains = e.target.checked
                              ? [...segment.domainIds, d._id]
                              : segment.domainIds.filter((id) => id !== d._id);
                            const allowed = new Set(nextDomains);
                            const nextSkillIds = segment.skillIds.filter((sid) => {
                              const sk = skills.find((x) => x._id === sid);
                              return sk && sk.domainIds.some((did) => allowed.has(did));
                            });
                            updateSegment(index, { domainIds: nextDomains, skillIds: nextSkillIds });
                          }}
                        />
                        {d.name}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
                Skills (filtered by selected domains)
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  maxHeight: 160,
                  overflowY: "auto",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2, var(--surface))",
                }}
              >
                {segment.domainIds.length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Select domains first.</span>
                ) : availableSkills.length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    No skills linked to these domains yet. Ask HR to tag skills in Skills Management.
                  </span>
                ) : (
                  availableSkills.map((sk) => {
                    const checked = segment.skillIds.includes(sk._id);
                    return (
                      <label
                        key={sk._id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={checked}
                          onChange={(e) => {
                            const nextSkills = e.target.checked
                              ? [...segment.skillIds, sk._id]
                              : segment.skillIds.filter((id) => id !== sk._id);
                            updateSegment(index, { skillIds: nextSkills });
                          }}
                        />
                        {sk.name}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={disabled}
                onClick={() => removeSegment(index)}
              >
                Remove segment
              </button>
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn-ghost" disabled={disabled} onClick={addSegment}>
        + Add segment
      </button>
    </div>
  );
}

export function validateExperienceSegmentsForSave(
  experienceYears: number,
  segments: ExperienceSegmentInput[],
): string | null {
  if (experienceYears <= 0) {
    if (segments.length > 0) return "Remove segments or set experience years above zero.";
    return null;
  }
  if (segments.length === 0) {
    return "Add segments or set experience years to zero.";
  }
  for (const segment of segments) {
    if (!Number.isInteger(segment.fromYear) || !Number.isInteger(segment.toYear)) {
      return "Use whole numbers for years.";
    }
    if (segment.fromYear > segment.toYear) return "From year must be before or equal to to year.";
    if (segment.domainIds.length === 0 || segment.skillIds.length === 0) {
      return "Each segment needs a domain and a skill.";
    }
  }
  if (hasSegmentOverlap(segments)) return "Segments overlap.";
  if (totalSegmentYears(segments) !== experienceYears) {
    return "Segment years don't match total experience years.";
  }
  return null;
}
