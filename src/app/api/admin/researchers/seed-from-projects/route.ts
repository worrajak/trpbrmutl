import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/admin/researchers/seed-from-projects
 *
 * Body: { dry_run?: boolean }  — ถ้า true ไม่ insert จริง · แค่ preview
 *
 * Logic:
 *  1. ดึง projects ที่ active (status in ['approved', 'in_progress'])
 *  2. Extract unique หัวหน้าโครงการ + organization + site
 *  3. Group by name (normalize): trim + lowercase → dedupe
 *  4. Skip ของที่มีใน rpf_researchers แล้ว (match by name)
 *  5. Insert (level=mid default · is_active=true · level จะให้ admin update)
 *  6. Return { skipped_existing, inserted, preview/inserted_records }
 */

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  responsible: string | null;
  responsible_title: string | null;
  organization: string | null;
  site: string | null;
  project_name: string;
  status: string | null;
  fiscal_year: number | null;
}

// ตัด prefix ชื่อ + normalize เพื่อ dedupe
function normalizeName(name: string): string {
  return name
    .replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.|ผศ\.|รศ\.|ศ\.|อ\.|อาจารย์|ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Heuristic: น่าจะเป็นชื่อบุคคล ไม่ใช่หน่วยงาน
function looksLikePerson(name: string | null): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  const orgKeywords = [
    "สถาบัน", "วิทยาลัย", "มหาวิทยาลัย", "ศูนย์", "สำนัก", "กอง",
    "ฝ่าย", "กลุ่ม", "สำนักงาน", "หน่วยงาน", "คณะ",
  ];
  if (orgKeywords.some((kw) => trimmed.startsWith(kw))) return false;
  // ถ้าเริ่มด้วยคำนำหน้าบุคคล → คน
  const personPrefixes = ["นาย", "นาง", "ดร", "ผศ", "รศ", "ศ", "อ", "อาจารย์"];
  return personPrefixes.some((p) => trimmed.startsWith(p));
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: { dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const dryRun = body.dry_run === true;

  // 1. ดึง projects ที่ active
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, responsible, responsible_title, organization, site, project_name, status, fiscal_year")
    .in("status", ["approved", "in_progress"]);

  if (projErr) {
    return NextResponse.json({ error: "ดึง projects ล้มเหลว: " + projErr.message }, { status: 500 });
  }

  // 2-3. Extract + group + dedupe
  type Aggregated = {
    name: string;
    title: string | null;
    organizations: Set<string>;
    sites: Set<string>;
    projects: string[];
  };
  const map = new Map<string, Aggregated>();

  for (const p of (projects as ProjectRow[]) || []) {
    if (!looksLikePerson(p.responsible)) continue;
    const key = normalizeName(p.responsible!);
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      if (p.organization) existing.organizations.add(p.organization);
      if (p.site) existing.sites.add(p.site);
      existing.projects.push(p.project_name);
    } else {
      map.set(key, {
        name: p.responsible!.trim(),
        title: p.responsible_title || null,
        organizations: p.organization ? new Set([p.organization]) : new Set(),
        sites: p.site ? new Set([p.site]) : new Set(),
        projects: [p.project_name],
      });
    }
  }

  // 4. ดึง existing rpf_researchers (เพื่อ skip)
  const { data: existing } = await supabase
    .from("rpf_researchers")
    .select("name");
  const existingKeys = new Set((existing || []).map((r) => normalizeName(r.name)));

  const newRecords = Array.from(map.values())
    .filter((r) => !existingKeys.has(normalizeName(r.name)))
    .map((r) => ({
      name: r.name,
      title: r.title,
      faculty: Array.from(r.organizations).join(" · ") || null,
      department: null,
      email: null,
      phone: null,
      expertise_tags: [], // admin จะใส่ภายหลัง
      areas: Array.from(r.sites).slice(0, 5), // เก็บแค่ 5 พื้นที่แรก
      past_projects: r.projects.slice(0, 5),
      level: "mid",
      bio: r.projects.length > 1
        ? `ผู้รับผิดชอบ ${r.projects.length} โครงการในกลุ่มแผนงาน · auto-imported`
        : "auto-imported จากระบบโครงการ · admin โปรดตรวจสอบ + เพิ่ม expertise tags",
      external_link: null,
      current_load: r.projects.length, // ถือว่าทุก active project = load
      is_active: true,
    }));

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dry_run: true,
      skipped_existing: map.size - newRecords.length,
      will_insert: newRecords.length,
      total_projects_scanned: projects?.length || 0,
      total_unique_persons: map.size,
      preview: newRecords.slice(0, 10).map((r) => ({
        name: r.name,
        title: r.title,
        faculty: r.faculty,
        areas: r.areas,
        current_load: r.current_load,
      })),
    });
  }

  if (newRecords.length === 0) {
    return NextResponse.json({
      success: true,
      skipped_existing: map.size,
      inserted: 0,
      message: "ไม่มีนักวิจัยใหม่ที่จะเพิ่ม (มีอยู่แล้วทั้งหมด)",
    });
  }

  // 5. Insert
  const { data: inserted, error: insErr } = await supabase
    .from("rpf_researchers")
    .insert(newRecords)
    .select("id, name, faculty");

  if (insErr) {
    return NextResponse.json({ error: "Insert ล้มเหลว: " + insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    skipped_existing: map.size - newRecords.length,
    inserted: inserted?.length || 0,
    total_projects_scanned: projects?.length || 0,
    total_unique_persons: map.size,
    inserted_records: inserted || [],
  });
}
