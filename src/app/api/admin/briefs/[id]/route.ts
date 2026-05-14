import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { syncBriefSkillsToCatalog, decrementBriefSkillsInCatalog } from "@/lib/sync-brief-skills";
import { summarizeSourceChain, type SourceChainItem } from "@/lib/ai-brief-generator-prompts";

/**
 * /api/admin/briefs/[id]
 *  GET    — single brief + interests + matched candidates
 *  PATCH  — update fields (whitelist)
 *  DELETE — hard delete (cascade brief_interests)
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

const PATCHABLE = new Set([
  "title", "problem_statement", "location", "target_audience",
  "target_kpis", "plan_number", "required_skills",
  "budget_min", "budget_max", "fiscal_year",
  "mode", "assigned_researcher_id", "mentor_researcher_id",
  "status", "deadline", "notes", "ai_ngor9_draft",
  "source_chain", "verification_status",
]);

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Parallel fetch brief + interests + assigned researchers
  const [briefRes, interestsRes] = await Promise.all([
    supabase.from("research_briefs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("brief_interests")
      .select("*, researcher:researchers(id, name, title, faculty, level, expertise_tags, areas, current_load)")
      .eq("brief_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (briefRes.error) return NextResponse.json({ error: briefRes.error.message }, { status: 500 });
  if (!briefRes.data) return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });

  return NextResponse.json(
    {
      brief: briefRes.data,
      interests: interestsRes.data || [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE.has(k)) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีฟิลด์ที่อนุญาต" }, { status: 400 });
  }

  // ถ้า source_chain ถูกแก้ → recompute min_credibility (verification_status ปล่อยให้ user override ได้)
  if (Object.prototype.hasOwnProperty.call(updates, "source_chain")) {
    const sc = (updates.source_chain as SourceChainItem[]) || [];
    const summary = summarizeSourceChain(sc);
    updates.min_credibility = summary.min_credibility;
    // ถ้า user ไม่ได้ส่ง verification_status มาด้วย → ใช้ค่าที่คำนวณ (อาจ flag ใหม่)
    if (!Object.prototype.hasOwnProperty.call(updates, "verification_status")) {
      updates.verification_status = summary.verification_status;
    }
  }

  updates.updated_at = new Date().toISOString();

  // ถ้า required_skills เปลี่ยน → ต้อง decrement old + sync new
  // (ดึง row เก่ามาก่อนเพื่อรู้ skill list เดิม)
  let oldSkills: string[] = [];
  if (Object.prototype.hasOwnProperty.call(updates, "required_skills")) {
    const { data: oldRow } = await supabase
      .from("research_briefs")
      .select("required_skills")
      .eq("id", id)
      .maybeSingle();
    oldSkills = (oldRow as { required_skills: string[] } | null)?.required_skills || [];
  }

  const { data, error } = await supabase
    .from("research_briefs")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });

  // Sync catalog: ลบ skill เก่าออก + เพิ่ม skill ใหม่เข้า (เฉพาะที่ต่างกัน)
  let skillSync: { added: string[]; updated: string[]; errors: string[] } | null = null;
  if (Object.prototype.hasOwnProperty.call(updates, "required_skills")) {
    const newSkills = (updates.required_skills as string[]) || [];
    const oldSet = new Set(oldSkills.map((s) => s.trim().toLowerCase()));
    const newSet = new Set(newSkills.map((s) => s.trim().toLowerCase()));

    const removed = oldSkills.filter((s) => !newSet.has(s.trim().toLowerCase()));
    const added = newSkills.filter((s) => !oldSet.has(s.trim().toLowerCase()));

    if (removed.length > 0) await decrementBriefSkillsInCatalog(supabase, removed);
    if (added.length > 0) {
      skillSync = await syncBriefSkillsToCatalog(supabase, added, {
        brief_id: id,
        brief_title: (data as { title: string }).title,
      });
    }
  }

  return NextResponse.json({ success: true, brief: data, skill_sync: skillSync });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // ดึง required_skills ก่อนลบ → ใช้ decrement catalog
  const { data: oldRow } = await supabase
    .from("research_briefs")
    .select("required_skills")
    .eq("id", id)
    .maybeSingle();
  const oldSkills = (oldRow as { required_skills: string[] } | null)?.required_skills || [];

  const { data, error } = await supabase
    .from("research_briefs")
    .delete()
    .eq("id", id)
    .select("id, title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "ไม่พบ brief หรือ RLS block" }, { status: 404 });
  }

  // Decrement catalog usage_count (และลบ auto-imported ที่ count → 0)
  if (oldSkills.length > 0) {
    await decrementBriefSkillsInCatalog(supabase, oldSkills);
  }

  return NextResponse.json({ success: true, deleted: data[0] });
}
