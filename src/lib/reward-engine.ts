import { getSupabase } from "./supabase";

// ===== Reward Configuration =====
// (ซ่อนจาก user — admin เห็นอย่างเดียว)

const REWARD_CONFIG = {
  onTimeReport: 500,        // ส่งรายงานตรงเวลา
  earlyBonus: 300,          // ส่งก่อนกำหนด
  consistencyBonus: 200,    // ส่งสม่ำเสมอ (streak)
  kpiVerified: 2000,        // KPI ครบเป้า 100%
  kpiPartial: 1200,         // KPI 80-99%
  kpiExceeded: 500,         // KPI เกินเป้า (bonus เพิ่ม)
  streakThreshold: 3,       // ส่งติดต่อกัน 3 ครั้ง = ได้ consistency bonus
};

// ===== ตรวจสอบว่าส่งตรงเวลา/เร็ว =====

function isEarlySubmission(plannedMonths: number[]): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  // ถ้าเดือนปัจจุบันอยู่ก่อนเดือนแรกที่กำหนด = ส่งเร็ว
  const firstPlanned = Math.min(...plannedMonths);
  // fiscal: ต.ค.=10 → ถ้า current < firstPlanned (ข้ามปี: 10,11,12 vs 1-9)
  if (firstPlanned >= 10 && currentMonth >= 10) {
    return currentMonth < firstPlanned;
  }
  if (firstPlanned <= 9 && currentMonth <= 9) {
    return currentMonth < firstPlanned;
  }
  if (firstPlanned >= 10 && currentMonth <= 9) {
    return false; // ส่งหลังข้ามปีแล้ว
  }
  return true; // current >= 10, firstPlanned <= 9 → ส่งก่อนข้ามปี = เร็ว
}

function isOnTime(plannedMonths: number[]): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const lastPlanned = Math.max(...plannedMonths);
  // ถ้าเดือนปัจจุบันอยู่ภายในช่วงแผน = ตรงเวลา
  return plannedMonths.includes(currentMonth) || isEarlySubmission(plannedMonths);
}

// ===== คำนวณ reward สำหรับรายงาน =====

export async function calculateAndGrantReward(
  reportId: string,
  projectId: string,
  tokenCode: string,
  activityId: string,
  kpiContributions: Array<{ kpi_target_id: string; value: number }>
): Promise<{ totalRpf: number; rewards: Array<{ type: string; amount: number; reason: string }> }> {
  try {
  const supabase = getSupabase();
  if (!supabase) return { totalRpf: 0, rewards: [] };

  const rewards: Array<{ type: string; amount: number; reason: string }> = [];

  // 1. ดึงข้อมูลกิจกรรม
  const { data: activity } = await supabase
    .from("activities")
    .select("planned_months")
    .eq("id", activityId)
    .single();

  if (activity) {
    const planned = activity.planned_months as number[];

    // Reward: ส่งตรงเวลา
    if (isOnTime(planned)) {
      rewards.push({
        type: "on_time",
        amount: REWARD_CONFIG.onTimeReport,
        reason: "ส่งรายงานตรงเวลา",
      });
    }

    // Reward: ส่งเร็ว (bonus)
    if (isEarlySubmission(planned)) {
      rewards.push({
        type: "early_bonus",
        amount: REWARD_CONFIG.earlyBonus,
        reason: "ส่งรายงานก่อนกำหนด",
      });
    }
  }

  // 2. ตรวจ streak (ความสม่ำเสมอ)
  const { data: balance } = await supabase
    .from("reward_balance")
    .select("*")
    .eq("token_code", tokenCode)
    .single();

  const today = new Date().toISOString().split("T")[0];
  let newStreak = 1;

  if (balance && balance.last_report_date) {
    const lastDate = new Date(balance.last_report_date);
    const daysSince = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // ถ้าส่งภายใน 35 วัน = streak ต่อเนื่อง (ประมาณเดือนละครั้ง)
    if (daysSince <= 35) {
      newStreak = (balance.streak_count || 0) + 1;
    }
  }

  if (newStreak >= REWARD_CONFIG.streakThreshold) {
    rewards.push({
      type: "consistency_bonus",
      amount: REWARD_CONFIG.consistencyBonus,
      reason: `ส่งรายงานสม่ำเสมอ ${newStreak} ครั้งติดต่อกัน`,
    });
  }

  // 3. ตรวจ KPI ที่ verified ใหม่
  for (const kc of kpiContributions) {
    const { data: kpi } = await supabase
      .from("kpi_targets")
      .select("target_value, actual_value, verified, kpi_name")
      .eq("id", kc.kpi_target_id)
      .single();

    if (kpi) {
      const newActual = Number(kpi.actual_value);
      const target = Number(kpi.target_value);
      const pct = target > 0 ? (newActual / target) * 100 : 0;

      if (pct >= 100 && kpi.verified) {
        if (pct > 100) {
          rewards.push({
            type: "kpi_exceeded",
            amount: REWARD_CONFIG.kpiExceeded,
            reason: `KPI เกินเป้า: ${kpi.kpi_name} (${Math.round(pct)}%)`,
          });
        }
        rewards.push({
          type: "kpi_verified",
          amount: REWARD_CONFIG.kpiVerified,
          reason: `KPI บรรลุเป้า: ${kpi.kpi_name}`,
        });
      } else if (pct >= 80) {
        rewards.push({
          type: "kpi_verified",
          amount: REWARD_CONFIG.kpiPartial,
          reason: `KPI ใกล้เป้า: ${kpi.kpi_name} (${Math.round(pct)}%)`,
        });
      }
    }
  }

  // 4. บันทึก reward_log
  const totalRpf = rewards.reduce((s, r) => s + r.amount, 0);

  for (const r of rewards) {
    await supabase.from("reward_log").insert({
      project_id: projectId,
      report_id: reportId,
      token_code: tokenCode,
      reward_type: r.type,
      rpf_amount: r.amount,
      reason: r.reason,
    });
  }

  // 5. อัปเดต reward_balance
  const newReportCount = (balance?.report_count || 0) + 1;
  const newTotalRpf = Number(balance?.total_rpf || 0) + totalRpf;

  await supabase.from("reward_balance").upsert({
    token_code: tokenCode,
    total_rpf: newTotalRpf,
    report_count: newReportCount,
    streak_count: newStreak,
    last_report_date: today,
    updated_at: new Date().toISOString(),
  });

  return { totalRpf, rewards };
  } catch (err) {
    console.error("Reward engine error:", err);
    return { totalRpf: 0, rewards: [] };
  }
}
