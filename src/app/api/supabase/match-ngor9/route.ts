import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/supabase/match-ngor9
 * รับ parsed NGOR9 data → คืน projects ที่อาจเป็นตัวเดียวกันใน DB
 *
 * Use case: ก่อน save NGOR9 ใหม่ → เช็คว่ามี project เดียวกันจาก Excel/ERP อยู่ไหม
 *           ถ้ามี → ให้ admin เลือก merge เข้าของเดิม แทนที่จะสร้างซ้ำ
 *
 * Algorithm:
 *   - กรองตาม fiscal_year (ถ้าระบุ)
 *   - คำนวณ name_score + responsible_score → total
 *   - คืน top 5 ที่ score >= 0.3
 */

export const dynamic = "force-dynamic";

interface MatchInput {
  project_name: string;
  responsible?: string | null;
  fiscal_year?: number;
  organization?: string | null;
}

interface ProjectRow {
  id: string;
  project_name: string;
  responsible: string | null;
  organization: string | null;
  fiscal_year: number | null;
  erp_code: string | null;
  budget_total: number | string | null;
  budget_used: number | string | null;
  main_program: string | null;
}

// ลบ prefix ที่ไม่สำคัญสำหรับการเปรียบเทียบ
function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/^\s*โครงการ\s*(การ\s*)?/g, "")
    .replace(/^\s*การ/, "")
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeResponsible(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/^(นาย|นาง|นางสาว|ดร\.|ผศ\.|รศ\.|ศ\.|อ\.|อาจารย์|ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.75;

  // Token overlap (Jaccard-ish, only meaningful tokens)
  const tokensA = new Set(na.split(/\s+/).filter((t) => t.length >= 3));
  const tokensB = new Set(nb.split(/\s+/).filter((t) => t.length >= 3));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let common = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) common++;
  });
  return common / Math.max(tokensA.size, tokensB.size);
}

function responsibleSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeResponsible(a);
  const nb = normalizeResponsible(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  return 0;
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: MatchInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.project_name) {
    return NextResponse.json({ error: "ต้องระบุ project_name" }, { status: 400 });
  }

  // ดึง projects ที่อาจตรงกัน — กรอง fiscal_year ถ้าระบุ
  let q = supabase
    .from("projects")
    .select("id, project_name, responsible, organization, fiscal_year, erp_code, budget_total, budget_used, main_program");
  if (body.fiscal_year) q = q.eq("fiscal_year", body.fiscal_year);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // คำนวณ score ทุก row
  const scored = ((data || []) as ProjectRow[])
    .map((p) => {
      const nameScore = nameSimilarity(body.project_name, p.project_name);
      const respScore = responsibleSimilarity(body.responsible, p.responsible);

      // weighted: name 60%, responsible 40%
      const total = nameScore * 0.6 + respScore * 0.4;

      // signals (ให้ admin ดูเหตุผล)
      const signals: string[] = [];
      if (nameScore >= 0.75) signals.push("ชื่อโครงการตรง/อยู่ในกัน");
      else if (nameScore >= 0.4) signals.push(`ชื่อคล้าย ${Math.round(nameScore * 100)}%`);
      if (respScore >= 0.8) signals.push("ผู้รับผิดชอบตรง");
      else if (respScore > 0) signals.push("ผู้รับผิดชอบใกล้เคียง");

      return {
        id: p.id,
        project_name: p.project_name,
        responsible: p.responsible,
        organization: p.organization,
        fiscal_year: p.fiscal_year,
        erp_code: p.erp_code,
        budget_total: Number(p.budget_total || 0),
        budget_used: Number(p.budget_used || 0),
        main_program: p.main_program,
        score: Math.round(total * 100) / 100,
        signals,
      };
    })
    .filter((p) => p.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // เพิ่ม count ของ activities/kpis เดิมในแต่ละ candidate
  // เพื่อให้ admin ตัดสินใจได้ว่าจะ replace/append/keep
  const enriched = await Promise.all(
    scored.map(async (c) => {
      const [{ count: actCount }, { count: kpiCount }] = await Promise.all([
        supabase.from("activities").select("*", { count: "exact", head: true }).eq("project_id", c.id),
        supabase.from("kpi_targets").select("*", { count: "exact", head: true }).eq("project_id", c.id),
      ]);
      return {
        ...c,
        existing_activities: actCount || 0,
        existing_kpis: kpiCount || 0,
      };
    })
  );

  return NextResponse.json(
    {
      matches: enriched,
      total_searched: data?.length || 0,
      threshold: 0.3,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
