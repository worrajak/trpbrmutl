/**
 * sync-brief-skills.ts
 *
 * เมื่อ brief ถูกสร้าง/แก้ไข → sync required_skills ไปที่ rpf_research_areas catalog
 *  - skill ที่มีใน catalog → bump usage_count + recompute demand_level
 *  - skill ใหม่             → insert (auto_imported=true, category='expertise')
 *
 * Match แบบ case-insensitive (LOWER) แต่เก็บ name ตามที่ AI ระบุ
 *
 * Returns: { added, updated } — list ของชื่อ skill ที่ insert/update ตามลำดับ
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient;

interface SyncSource {
  brief_id?: string;
  brief_title?: string;
}

interface SyncResult {
  added: string[];   // skill names ที่เพิ่งสร้าง
  updated: string[]; // skill names ที่ bump count แล้ว
  errors: string[];  // ข้อผิดพลาด (non-fatal — sync ต่อเนื่อง)
}

/** คำนวณ demand_level จาก usage_count */
export function computeDemandLevel(count: number): "high" | "medium" | "low" {
  if (count >= 4) return "high";
  if (count >= 2) return "medium";
  return "low";
}

/** Normalize skill name — trim + ลบช่องว่างซ้ำ */
function normalizeSkillName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export async function syncBriefSkillsToCatalog(
  supabase: AnySupabase,
  rawSkills: string[] | null | undefined,
  source: SyncSource = {}
): Promise<SyncResult> {
  const result: SyncResult = { added: [], updated: [], errors: [] };

  // Normalize + dedupe
  const skills = Array.from(
    new Set(
      (rawSkills || [])
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .map(normalizeSkillName)
    )
  );

  if (skills.length === 0) return result;

  // Fetch existing entries (case-insensitive name match)
  // ใช้ ilike กับ in() ไม่ตรง syntax → fetch ทั้งหมดแล้ว filter ใน JS
  // (catalog ขนาดเล็ก < 500 รายการ — OK)
  const { data: existingAll, error: fetchErr } = await supabase
    .from("rpf_research_areas")
    .select("id, name, usage_count, auto_imported, first_brief_id");

  if (fetchErr) {
    result.errors.push(`fetch catalog ล้มเหลว: ${fetchErr.message}`);
    return result;
  }

  type AreaRow = {
    id: string;
    name: string;
    usage_count: number | null;
    auto_imported: boolean | null;
    first_brief_id: string | null;
  };
  const existing = (existingAll as AreaRow[] | null) || [];

  // Build case-insensitive lookup
  const existingMap = new Map<string, AreaRow>();
  for (const row of existing) {
    existingMap.set(row.name.toLowerCase(), row);
  }

  // แยก skill ที่มีอยู่แล้วกับที่ต้อง insert ใหม่
  const toUpdate: AreaRow[] = [];
  const toInsert: string[] = [];

  for (const s of skills) {
    const found = existingMap.get(s.toLowerCase());
    if (found) toUpdate.push(found);
    else toInsert.push(s);
  }

  // Insert skill ใหม่
  if (toInsert.length > 0) {
    const insertRows = toInsert.map((name) => ({
      name,
      icon: "🏷",
      category: "expertise" as const,
      description: source.brief_title
        ? `ความเชี่ยวชาญที่ปรากฏใน brief: ${source.brief_title.slice(0, 100)}`
        : null,
      related_skills: [],
      related_kpis: [],
      related_plans: [],
      demand_level: "low" as const,  // เริ่มที่ low (1 brief)
      notes: "🤖 auto-imported จาก AI brief generator",
      is_active: true,
      usage_count: 1,
      auto_imported: true,
      first_brief_id: source.brief_id || null,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("rpf_research_areas")
      .insert(insertRows)
      .select("name");

    if (insErr) {
      result.errors.push(`insert ใหม่ล้มเหลว: ${insErr.message}`);
    } else {
      result.added = (inserted || []).map((r) => (r as { name: string }).name);
    }
  }

  // Update skill ที่มีอยู่แล้ว — bump usage_count + recompute demand
  for (const row of toUpdate) {
    const newCount = (row.usage_count || 0) + 1;
    const newDemand = computeDemandLevel(newCount);

    const { error: updErr } = await supabase
      .from("rpf_research_areas")
      .update({
        usage_count: newCount,
        demand_level: newDemand,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updErr) {
      result.errors.push(`update ${row.name} ล้มเหลว: ${updErr.message}`);
    } else {
      result.updated.push(row.name);
    }
  }

  return result;
}

/**
 * เมื่อ brief ถูกลบ — ลด usage_count ของ skills ที่อ้างอิงไป
 * (optional ใช้ใน DELETE handler)
 */
export async function decrementBriefSkillsInCatalog(
  supabase: AnySupabase,
  rawSkills: string[] | null | undefined
): Promise<SyncResult> {
  const result: SyncResult = { added: [], updated: [], errors: [] };
  const skills = Array.from(
    new Set(
      (rawSkills || [])
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .map(normalizeSkillName)
    )
  );
  if (skills.length === 0) return result;

  const { data: existingAll, error: fetchErr } = await supabase
    .from("rpf_research_areas")
    .select("id, name, usage_count, auto_imported");

  if (fetchErr) {
    result.errors.push(`fetch catalog ล้มเหลว: ${fetchErr.message}`);
    return result;
  }

  type AreaRow = { id: string; name: string; usage_count: number | null; auto_imported: boolean | null };
  const existing = (existingAll as AreaRow[] | null) || [];
  const lookup = new Map<string, AreaRow>();
  for (const r of existing) lookup.set(r.name.toLowerCase(), r);

  for (const s of skills) {
    const found = lookup.get(s.toLowerCase());
    if (!found) continue;
    const newCount = Math.max(0, (found.usage_count || 0) - 1);

    if (newCount === 0 && found.auto_imported) {
      // ถ้า count → 0 และเป็น auto-imported → ลบออก
      const { error: delErr } = await supabase
        .from("rpf_research_areas")
        .delete()
        .eq("id", found.id);
      if (delErr) result.errors.push(`delete ${found.name}: ${delErr.message}`);
      else result.updated.push(`${found.name} (deleted, count=0)`);
    } else {
      const newDemand = computeDemandLevel(Math.max(1, newCount));
      const { error: updErr } = await supabase
        .from("rpf_research_areas")
        .update({
          usage_count: newCount,
          demand_level: newDemand,
          updated_at: new Date().toISOString(),
        })
        .eq("id", found.id);
      if (updErr) result.errors.push(`update ${found.name}: ${updErr.message}`);
      else result.updated.push(`${found.name} (count=${newCount})`);
    }
  }

  return result;
}
