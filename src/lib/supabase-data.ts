import { getSupabase } from "./supabase";

// ===== Types for Supabase data =====

export interface DBProject {
  id: string;
  main_program: string;
  organization: string;
  project_name: string;
  erp_code: string | null;
  responsible: string | null;
  responsible_title: string | null;
  phone: string | null;
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
  fiscal_year: number;
  project_period: string | null;
  site: string | null;
  status: string;
}

export interface DBActivity {
  id: string;
  project_id: string;
  activity_order: number;
  activity_name: string;
  budget: number;
  planned_months: number[];
  expected_output: string | null;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
}

export interface DBKpiTarget {
  id: string;
  project_id: string;
  kpi_name: string;
  kpi_type: string;
  target_value: number;
  actual_value: number;
  unit: string | null;
  verified: boolean;
}

export interface DBNotification {
  id: string;
  project_id: string;
  activity_id: string | null;
  type: string;
  message: string;
  target_user: string | null;
  is_read: boolean;
  created_at: string;
}

// ===== Helpers =====

/**
 * ป้องกันชื่อสถาบัน/หน่วยงานถูกแสดงเป็น "ผู้รับผิดชอบ"
 * ถ้า responsible ว่าง หรือเหมือนกับ organization → คืน null
 */
function sanitizeResponsible(
  responsible: string | null,
  organization: string | null
): string | null {
  if (!responsible || responsible.trim() === "") return null;
  // ถ้าชื่อเหมือนกับชื่อสถาบัน/หน่วยงาน → ไม่ใช่ชื่อคน
  if (organization && responsible.trim() === organization.trim()) return null;
  // ถ้าชื่อมีคำบ่งบอกว่าเป็นหน่วยงาน → ไม่ใช่ชื่อคน
  const orgKeywords = ["สถาบัน", "วิทยาลัย", "มหาวิทยาลัย", "ศูนย์", "สำนัก", "กอง", "ฝ่าย", "กลุ่ม", "สำนักงาน"];
  if (orgKeywords.some((kw) => responsible.trim().startsWith(kw))) return null;
  return responsible;
}

// ===== Data fetching functions =====

export async function fetchProjects(): Promise<DBProject[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("main_program");
  if (error) {
    console.error("fetchProjects error:", error.message);
    return [];
  }
  // กรอง parent/summary rows (erp_code ลงท้าย 0000) ออก เพื่อป้องกันนับซ้ำ
  return (data || [])
    .filter((p) => !p.erp_code || !p.erp_code.endsWith("0000"))
    .map((p) => ({
      ...p,
      responsible: sanitizeResponsible(p.responsible, p.organization),
    }));
}

export async function fetchProjectById(
  id: string
): Promise<DBProject | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function fetchActivities(
  projectId?: string
): Promise<DBActivity[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let query = supabase
    .from("activities")
    .select("*")
    .order("activity_order");
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) {
    console.error("fetchActivities error:", error.message);
    return [];
  }
  return data || [];
}

export async function fetchKpiTargets(
  projectId?: string
): Promise<DBKpiTarget[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let query = supabase.from("kpi_targets").select("*");
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) {
    console.error("fetchKpiTargets error:", error.message);
    return [];
  }
  return data || [];
}

export async function fetchNotifications(
  unreadOnly = true
): Promise<DBNotification[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (unreadOnly) query = query.eq("is_read", false);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

// ===== Computed summaries =====

export interface ProgramSummary {
  program: string;
  projectCount: number;
  budgetTotal: number;
  budgetUsed: number;
  budgetRemaining: number;
  usagePercent: number;
}

export function computeProgramSummaries(
  projects: DBProject[]
): ProgramSummary[] {
  const map = new Map<string, ProgramSummary>();
  for (const p of projects) {
    const existing = map.get(p.main_program) || {
      program: p.main_program,
      projectCount: 0,
      budgetTotal: 0,
      budgetUsed: 0,
      budgetRemaining: 0,
      usagePercent: 0,
    };
    existing.projectCount++;
    existing.budgetTotal += Number(p.budget_total);
    existing.budgetUsed += Number(p.budget_used);
    existing.budgetRemaining += Number(p.budget_remaining);
    map.set(p.main_program, existing);
  }
  const result = Array.from(map.values());
  result.forEach((s) => {
    s.usagePercent =
      s.budgetTotal > 0 ? Math.round((s.budgetUsed / s.budgetTotal) * 100) : 0;
  });
  return result;
}

export interface KpiOverview {
  total: number;
  verified: number;
  exceeded: number;
  inProgress: number;
  notStarted: number;
}

export function computeKpiOverview(kpis: DBKpiTarget[]): KpiOverview {
  const quantitative = kpis.filter((k) => k.kpi_type === "quantitative");
  return {
    total: quantitative.length,
    verified: quantitative.filter((k) => k.verified).length,
    exceeded: quantitative.filter(
      (k) => k.actual_value > k.target_value && k.target_value > 0
    ).length,
    inProgress: quantitative.filter(
      (k) => k.actual_value > 0 && k.actual_value < k.target_value
    ).length,
    notStarted: quantitative.filter((k) => k.actual_value === 0).length,
  };
}

// ===== Activity alerts (กิจกรรมที่ใกล้ถึง/เลยกำหนด) =====

export interface ActivityAlert {
  projectId: string;
  projectName: string;
  activityName: string;
  responsible: string | null;
  alertType: "overdue" | "due_this_month" | "upcoming";
  plannedMonth: number;
}

export function computeActivityAlerts(
  projects: DBProject[],
  activities: DBActivity[]
): ActivityAlert[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const alerts: ActivityAlert[] = [];

  for (const act of activities) {
    if (act.status === "completed" || act.status === "cancelled") continue;

    const project = projects.find((p) => p.id === act.project_id);
    if (!project) continue;

    for (const pm of act.planned_months) {
      // เดือนที่แผนกำหนด vs เดือนปัจจุบัน
      if (pm === currentMonth && act.status === "not_started") {
        alerts.push({
          projectId: project.id,
          projectName: project.project_name,
          activityName: act.activity_name,
          responsible: project.responsible,
          alertType: "due_this_month",
          plannedMonth: pm,
        });
        break;
      }

      // เลยกำหนดแล้ว (เดือนที่ผ่านมา)
      const isOverdue =
        pm < currentMonth
          ? currentMonth - pm <= 2 // ไม่เกิน 2 เดือนที่ผ่านมา
          : pm > 9 && currentMonth < 3; // ข้ามปี: ต.ค.-ธ.ค. ปีก่อน

      if (isOverdue && act.status === "not_started") {
        alerts.push({
          projectId: project.id,
          projectName: project.project_name,
          activityName: act.activity_name,
          responsible: project.responsible,
          alertType: "overdue",
          plannedMonth: pm,
        });
        break;
      }

      // 10 วันล่วงหน้า = เดือนถัดไป
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (pm === nextMonth && act.status === "not_started") {
        alerts.push({
          projectId: project.id,
          projectName: project.project_name,
          activityName: act.activity_name,
          responsible: project.responsible,
          alertType: "upcoming",
          plannedMonth: pm,
        });
        break;
      }
    }
  }

  // Sort: overdue first, then due_this_month, then upcoming
  const priority = { overdue: 0, due_this_month: 1, upcoming: 2 };
  alerts.sort((a, b) => priority[a.alertType] - priority[b.alertType]);

  return alerts;
}

const MONTH_NAMES: Record<number, string> = {
  1: "ม.ค.",
  2: "ก.พ.",
  3: "มี.ค.",
  4: "เม.ย.",
  5: "พ.ค.",
  6: "มิ.ย.",
  7: "ก.ค.",
  8: "ส.ค.",
  9: "ก.ย.",
  10: "ต.ค.",
  11: "พ.ย.",
  12: "ธ.ค.",
};

export function getMonthName(m: number): string {
  return MONTH_NAMES[m] || `เดือน ${m}`;
}
