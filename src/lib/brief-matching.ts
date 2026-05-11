/**
 * brief-matching.ts — คำนวณ match score ระหว่าง brief × researcher
 *
 * ใช้ใน:
 *  - /briefs/[id] — admin เห็น candidates ranked
 *  - researcher login → see briefs ที่ตรง expertise
 *
 * Algorithm (no AI yet — Phase 3 จะเพิ่ม LLM rerank):
 *   - skill overlap (Jaccard) × 60%
 *   - area overlap × 20%
 *   - level fit × 10% (mode mentorship: junior/mid/senior คู่กัน)
 *   - load penalty × 10% (current_load สูง → score ลด)
 */

export interface ResearcherForMatch {
  id: string;
  name: string;
  level: "junior" | "mid" | "senior";
  expertise_tags: string[];
  areas: string[];
  current_load?: number;
}

export interface BriefForMatch {
  id?: string;
  required_skills: string[];
  location?: string | null;
  mode?: "open" | "assigned" | "mentorship";
}

export interface MatchScore {
  researcher: ResearcherForMatch;
  totalScore: number; // 0-100
  skillScore: number;
  skillMatched: string[];
  areaScore: number;
  areaMatched: string[];
  levelScore: number;
  loadScore: number;
  reasons: string[];
}

/** Jaccard similarity (intersection / union) */
function jaccard(a: string[], b: string[]): { score: number; matched: string[] } {
  if (a.length === 0 || b.length === 0) return { score: 0, matched: [] };
  const setA = new Set(a);
  const setB = new Set(b);
  const matched: string[] = [];
  setA.forEach((x) => {
    if (setB.has(x)) matched.push(x);
  });
  const unionSize = new Set([...a, ...b]).size;
  return { score: matched.length / unionSize, matched };
}

/** บางที location มี substring คล้ายกับ area */
function locationOverlap(briefLocation: string | null | undefined, researcherAreas: string[]): { score: number; matched: string[] } {
  if (!briefLocation) return { score: 0.5, matched: [] }; // neutral
  if (researcherAreas.length === 0) return { score: 0, matched: [] };
  const loc = briefLocation.toLowerCase();
  const matched: string[] = [];
  for (const a of researcherAreas) {
    const al = a.toLowerCase();
    if (al.includes(loc) || loc.includes(al)) matched.push(a);
  }
  return { score: matched.length > 0 ? 1 : 0.2, matched };
}

/** Level score ตาม mode */
function levelScore(level: "junior" | "mid" | "senior", mode?: string): number {
  if (mode === "mentorship") {
    // mentorship: ทุก level OK (รอ pair)
    return 0.8;
  }
  if (mode === "assigned") {
    return level === "senior" ? 1 : level === "mid" ? 0.7 : 0.4;
  }
  // open: senior > mid > junior
  return level === "senior" ? 1 : level === "mid" ? 0.8 : 0.5;
}

/** Load penalty: 0 load = full score, ≥3 load = penalty */
function loadScore(load = 0): number {
  if (load === 0) return 1;
  if (load === 1) return 0.85;
  if (load === 2) return 0.65;
  if (load === 3) return 0.4;
  return 0.2;
}

export function computeMatchScore(
  brief: BriefForMatch,
  researcher: ResearcherForMatch
): MatchScore {
  const { score: skillJ, matched: skillMatched } = jaccard(brief.required_skills, researcher.expertise_tags);
  const { score: areaS, matched: areaMatched } = locationOverlap(brief.location, researcher.areas);
  const lvlS = levelScore(researcher.level, brief.mode);
  const loadS = loadScore(researcher.current_load);

  // weighted: skill 60% / area 20% / level 10% / load 10%
  const total = skillJ * 60 + areaS * 20 + lvlS * 10 + loadS * 10;

  const reasons: string[] = [];
  if (skillMatched.length >= 3) reasons.push(`เชี่ยวชาญตรง ${skillMatched.length} ด้าน`);
  else if (skillMatched.length > 0) reasons.push(`เชี่ยวชาญตรง ${skillMatched.length} ด้าน`);
  else reasons.push("ไม่มี expertise ตรง");
  if (areaMatched.length > 0) reasons.push(`เคยทำงานในพื้นที่`);
  if (researcher.level === "senior") reasons.push("Senior — เหมาะนำโครงการ");
  else if (researcher.level === "mid" && brief.mode === "mentorship") reasons.push("Mid — เหมาะ pair กับ senior");
  if ((researcher.current_load || 0) === 0) reasons.push("ว่าง — ไม่มีโครงการอื่นค้าง");
  else if ((researcher.current_load || 0) >= 3) reasons.push(`⚠ ภาระงานสูง (${researcher.current_load} โครงการ)`);

  return {
    researcher,
    totalScore: Math.round(total),
    skillScore: Math.round(skillJ * 100),
    skillMatched,
    areaScore: Math.round(areaS * 100),
    areaMatched,
    levelScore: Math.round(lvlS * 100),
    loadScore: Math.round(loadS * 100),
    reasons,
  };
}

/** Rank researchers ทั้งหมดสำหรับ brief — return top N */
export function rankResearchers(
  brief: BriefForMatch,
  researchers: ResearcherForMatch[],
  topN = 10
): MatchScore[] {
  return researchers
    .map((r) => computeMatchScore(brief, r))
    .filter((m) => m.totalScore >= 10) // ตัดที่ score ต่ำมาก
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, topN);
}

/** Reverse: รับ researcher → คืน briefs ที่ match */
export function findMatchingBriefs(
  researcher: ResearcherForMatch,
  briefs: BriefForMatch[],
  topN = 10
): { brief: BriefForMatch; match: MatchScore }[] {
  return briefs
    .map((b) => ({ brief: b, match: computeMatchScore(b, researcher) }))
    .filter((x) => x.match.totalScore >= 20)
    .sort((a, b) => b.match.totalScore - a.match.totalScore)
    .slice(0, topN);
}

/** Status badge metadata */
export const BRIEF_STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700 ring-slate-200", emoji: "📝" },
  open: { label: "เปิดรับ", color: "bg-emerald-50 text-emerald-700 ring-emerald-200", emoji: "🔓" },
  matched: { label: "พบนักวิจัยแล้ว", color: "bg-blue-50 text-blue-700 ring-blue-200", emoji: "🤝" },
  in_progress: { label: "กำลังดำเนินงาน", color: "bg-amber-50 text-amber-700 ring-amber-200", emoji: "⚙" },
  closed: { label: "ปิดแล้ว", color: "bg-slate-200 text-slate-600 ring-slate-300", emoji: "✅" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-700 ring-red-200", emoji: "❌" },
};

export const BRIEF_MODE_META: Record<string, { label: string; color: string; emoji: string; desc: string }> = {
  open: {
    label: "Open Brief",
    color: "bg-emerald-50 text-emerald-800 ring-emerald-300",
    emoji: "📢",
    desc: "เปิดรับสมัคร — ใครสนใจก็ apply ได้",
  },
  assigned: {
    label: "Assigned",
    color: "bg-blue-50 text-blue-800 ring-blue-300",
    emoji: "🎯",
    desc: "มอบให้ senior คนใดคนหนึ่งโดยตรง",
  },
  mentorship: {
    label: "Mentorship",
    color: "bg-violet-50 text-violet-800 ring-violet-300",
    emoji: "🌱",
    desc: "Mentor (senior) + Mentee (junior/mid) — สร้างนักวิจัยใหม่",
  },
};
