// ตัวชี้วัด (KPI Indicator)
export interface Indicator {
  id: string;
  code: string; // e.g. "kpi-10", "kpi-35"
  name: string;
  target: number;
  unit: string;
  description: string;
  source: "rmutl" | "swps"; // ตัวชี้วัด มทร.ล้านนา หรือ สวพส.
}

// โครงการหลัก (Main Project / Program)
export interface MainProject {
  id: string;
  code: string;
  name: string;
  budget: number;
  strategy: string;
  plan: string;
  source: "ขับเคลื่อนกลไก" | "ผลักดันเทคโนโลยี" | "พัฒนากำลังคน";
}

// โครงการย่อย (Sub-project)
export interface SubProject {
  id: string;
  code: string; // e.g. "3.1.1.1"
  name: string;
  mainProjectId: string;
  budget: number;
  responsible: string;
  responsibleOrg: string;
  site: string;
  status: "approved" | "pending" | "revision" | "completed";
  budgetApproved: boolean;
  inProcess: boolean;
  needsRevision: boolean;
  // Indicator contributions
  indicatorContributions: IndicatorContribution[];
  // สวพส. fields
  budgetUsed?: number;
  budgetRemaining?: number;
  expectedOutputs?: string[];
  kpiText?: string;
}

// ผลการดำเนินงานต่อตัวชี้วัด
export interface IndicatorContribution {
  indicatorId: string;
  target: number;
  actual: number;
  unit: string;
  description: string;
}

// สรุปตัวชี้วัดระดับโครงการหลัก
export interface IndicatorSummary {
  indicatorId: string;
  indicatorName: string;
  overallTarget: number;
  totalActual: number;
  unit: string;
  percentage: number;
  contributions: {
    subProjectId: string;
    subProjectName: string;
    target: number;
    actual: number;
  }[];
}

// พื้นที่โครงการหลวง
export interface RoyalProjectSite {
  id: string;
  name: string;
  province: string;
}

// บุคลากรกลุ่มแผนงานใต้ร่มพระบารมี
export interface Staff {
  id: string;
  name: string;
  position: string;
  role: "ที่ปรึกษา" | "ผู้บริหาร" | "คณะทำงาน" | "เจ้าหน้าที่";
  email?: string;
  phone?: string;
}
