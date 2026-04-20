export type ExperienceSegmentInput = {
  fromYear: number;
  toYear: number;
  domainIds: string[];
  skillIds: string[];
  /** Optional employer / organization for this period */
  company?: string;
};

export function segmentYears(segment: ExperienceSegmentInput): number {
  return segment.fromYear === segment.toYear ? 1 : Math.max(0, segment.toYear - segment.fromYear);
}

export function totalSegmentYears(segments: ExperienceSegmentInput[]): number {
  return (segments || []).reduce((sum, segment) => sum + segmentYears(segment), 0);
}

export function hasSegmentOverlap(segments: ExperienceSegmentInput[]): boolean {
  const ranges = (segments || [])
    .map((segment) => {
      const start = Number(segment.fromYear);
      const endExclusive =
        Number(segment.toYear) === Number(segment.fromYear)
          ? Number(segment.fromYear) + 1
          : Number(segment.toYear);
      return { start, endExclusive };
    })
    .sort((a, b) => a.start - b.start || a.endExclusive - b.endExclusive);

  for (let i = 1; i < ranges.length; i += 1) {
    if (ranges[i].start < ranges[i - 1].endExclusive) return true;
  }
  return false;
}

export function normalizeSegment(segment?: Partial<ExperienceSegmentInput>): ExperienceSegmentInput {
  const companyRaw =
    typeof segment?.company === 'string' ? segment.company.trim().slice(0, 120) : '';
  const base: ExperienceSegmentInput = {
    fromYear: Number(segment?.fromYear || new Date().getFullYear()),
    toYear: Number(segment?.toYear || new Date().getFullYear()),
    domainIds: Array.isArray(segment?.domainIds) ? segment!.domainIds.filter(Boolean) : [],
    skillIds: Array.isArray(segment?.skillIds) ? segment!.skillIds.filter(Boolean) : [],
  };
  return companyRaw ? { ...base, company: companyRaw } : base;
}
