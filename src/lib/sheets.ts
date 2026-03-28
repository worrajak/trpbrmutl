import { SubProject, IndicatorContribution } from "./types";

const SPREADSHEET_ID = "1ANqPX8Ph3paP8-p3j6a4q5bEvK_Hec0DD4LPCL-H5No";

// gid ของแต่ละ sheet
const SHEETS = {
  ขับเคลื่อน: 0,
  ผลักดัน: 1931978188,
  พัฒนาคน: 2127016950,
  ผลการดำเนินงานตัวชี้วัดผลักดัน: 1570547137,
  ผลการดำเนินงานตัวชี้วัดพัฒนาคน: 1586854432,
  คตป: 975985165,
} as const;

function csvExportUrl(gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

// Parse CSV (handles quoted fields with commas and newlines)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n") {
        row.push(current.trim());
        current = "";
        if (row.some((c) => c !== "")) rows.push(row);
        row = [];
      } else if (ch !== "\r") {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);

  return rows;
}

function parseBudget(val: string): number {
  if (!val) return 0;
  return parseInt(val.replace(/[,\s]/g, ""), 10) || 0;
}

function parseBoolean(val: string): boolean {
  return val === "TRUE" || val === "true" || val === "1";
}

// ดึงข้อมูล sheet ขับเคลื่อน (gid=0)
export async function fetchKabkleuan(): Promise<SubProject[]> {
  const url = csvExportUrl(SHEETS.ขับเคลื่อน);
  const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 นาที
  if (!res.ok) return [];

  const text = await res.text();
  const rows = parseCSV(text);
  const projects: SubProject[] = [];

  for (const row of rows) {
    const cell0 = row[0] || "";
    // ตรวจจับโครงการย่อยจากรหัส เช่น 3.1.1.1, 5.1.1.1
    const codeMatch = cell0.match(/^(\d+\.\d+\.\d+\.\d+)/);
    if (!codeMatch) continue;
    const code = codeMatch[1];

    const budget = parseBudget(row[1]);
    const responsibleInternal = row[2] || "";
    const responsibleExternal = row[3] || "";
    const site = row[4] || "";
    const budgetApproved = parseBoolean(row[5]);
    const inProcess = parseBoolean(row[6]);
    const needsRevision = parseBoolean(row[7]);

    const responsible = responsibleInternal || responsibleExternal;
    const responsibleOrg = responsibleInternal
      ? "งานใต้ร่มพระบารมี"
      : "นอกกลุ่มแผนงานฯ";

    let status: SubProject["status"] = "pending";
    if (budgetApproved) status = "approved";
    else if (needsRevision) status = "revision";
    else if (inProcess) status = "pending";

    // Parse indicator contributions from columns 8-12
    const contributions: IndicatorContribution[] = [];

    // col 8: ตัวชี้วัดที่ 10
    if (row[8]) {
      const num = parseInt(row[8]) || 1;
      contributions.push({
        indicatorId: "kpi-10",
        target: num,
        actual: 0,
        unit: "เครือข่าย",
        description: row[8],
      });
    }
    // col 9: ตัวชี้วัดที่ 35
    if (row[9]) {
      const match = row[9].match(/(\d+)/);
      contributions.push({
        indicatorId: "kpi-35",
        target: match ? parseInt(match[1]) : 5,
        actual: 0,
        unit: "คน",
        description: row[9],
      });
    }
    // col 10: ตัวชี้วัดที่ 36
    if (row[10]) {
      const match = row[10].match(/(\d+)/);
      contributions.push({
        indicatorId: "kpi-36",
        target: match ? parseInt(match[1]) : 1,
        actual: 0,
        unit: "แหล่งเรียนรู้",
        description: row[10],
      });
    }
    // col 11: ตัวชี้วัดที่ 40
    if (row[11]) {
      const match = row[11].match(/(\d+)/);
      contributions.push({
        indicatorId: "kpi-40",
        target: match ? parseInt(match[1]) : 1,
        actual: 0,
        unit: "องค์ความรู้",
        description: row[11],
      });
    }
    // col 12: ตัวชี้วัดที่ 39
    if (row[12]) {
      const match = row[12].match(/(\d+)/);
      contributions.push({
        indicatorId: "kpi-39",
        target: match ? parseInt(match[1]) : 1,
        actual: 0,
        unit: "องค์ความรู้",
        description: row[12],
      });
    }

    // หา main project จาก code
    let mainProjectId = "mp-kk-311";
    if (code.startsWith("3.1.2")) mainProjectId = "mp-kk-312";
    else if (code.startsWith("3.1.3")) mainProjectId = "mp-kk-313";
    else if (code.startsWith("5.1.1")) mainProjectId = "mp-kk-511";

    // หาชื่อโครงการ: ใน sheet ขับเคลื่อน ชื่ออยู่ในแถวก่อนหน้า
    // แต่ CSV ไม่มี context แถว ใช้ code + ข้อมูลที่มีแทน
    const name = findProjectName(rows, code);

    projects.push({
      id: `sp-${code.replace(/\./g, "")}`,
      code,
      name: name || `โครงการ ${code}`,
      mainProjectId,
      budget,
      responsible,
      responsibleOrg,
      site,
      status,
      budgetApproved,
      inProcess,
      needsRevision,
      indicatorContributions: contributions,
    });
  }

  return projects;
}

// ค้นหาชื่อโครงการจาก rows (ชื่อเต็มอยู่ในคอลัมน์ 0 ของแถวที่มี code ตรง)
function findProjectName(rows: string[][], code: string): string {
  for (const row of rows) {
    const cell = row[0] || "";
    // ชื่อโครงการจะขึ้นต้นด้วย code แล้วตามด้วยชื่อ เช่น "3.1.1.1 โครงการ..."
    if (cell.startsWith(code) && cell.length > code.length + 2) {
      return cell.substring(code.length).replace(/^[\s.]+/, "").trim();
    }
  }
  return "";
}

// ดึงข้อมูล sheet ผลักดัน
export async function fetchPhlakdan(): Promise<SubProject[]> {
  const url = csvExportUrl(SHEETS.ผลักดัน);
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const text = await res.text();
  const rows = parseCSV(text);
  const projects: SubProject[] = [];

  for (const row of rows) {
    const cell0 = row[0] || "";
    const codeMatch = cell0.match(/^(\d+\.\d+\.\d+\.\d+)/);
    if (!codeMatch) continue;
    const code = codeMatch[1];

    const budget = parseBudget(row[1]);
    const responsibleInternal = row[2] || "";
    const responsibleExternal = row[3] || "";
    const site = row[4] || "";
    const budgetApproved = parseBoolean(row[5]);
    const inProcess = parseBoolean(row[6]);
    const needsRevision = parseBoolean(row[7]);

    const responsible = responsibleInternal || responsibleExternal;
    const responsibleOrg = responsibleInternal
      ? "งานใต้ร่มพระบารมี"
      : "นอกกลุ่มแผนงานฯ";

    let status: SubProject["status"] = "pending";
    if (budgetApproved) status = "approved";
    else if (needsRevision) status = "revision";

    const contributions: IndicatorContribution[] = [];
    // Parse indicators from remaining columns (same pattern)
    if (row[8]) contributions.push({ indicatorId: "kpi-10", target: parseInt(row[8]) || 1, actual: 0, unit: "เครือข่าย", description: row[8] });
    if (row[9]) contributions.push({ indicatorId: "kpi-35", target: parseInt(row[9]?.match(/(\d+)/)?.[1] || "5"), actual: 0, unit: "คน", description: row[9] });
    if (row[10]) contributions.push({ indicatorId: "kpi-36", target: parseInt(row[10]?.match(/(\d+)/)?.[1] || "1"), actual: 0, unit: "แหล่งเรียนรู้", description: row[10] });
    if (row[11]) contributions.push({ indicatorId: "kpi-40", target: parseInt(row[11]?.match(/(\d+)/)?.[1] || "1"), actual: 0, unit: "องค์ความรู้", description: row[11] });
    if (row[12]) contributions.push({ indicatorId: "kpi-39", target: parseInt(row[12]?.match(/(\d+)/)?.[1] || "1"), actual: 0, unit: "องค์ความรู้", description: row[12] });

    const name = findProjectName(rows, code);

    projects.push({
      id: `sp-pd-${code.replace(/\./g, "")}`,
      code,
      name: name || `โครงการผลักดัน ${code}`,
      mainProjectId: "mp-pd",
      budget,
      responsible,
      responsibleOrg,
      site,
      status,
      budgetApproved,
      inProcess,
      needsRevision,
      indicatorContributions: contributions,
    });
  }

  return projects;
}

// ดึงข้อมูล sheet พัฒนาคน
export async function fetchPattanakhon(): Promise<SubProject[]> {
  const url = csvExportUrl(SHEETS.พัฒนาคน);
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const text = await res.text();
  const rows = parseCSV(text);
  const projects: SubProject[] = [];

  for (const row of rows) {
    const cell0 = row[0] || "";
    const codeMatch = cell0.match(/^(\d+\.\d+\.\d+\.\d+)/);
    if (!codeMatch) continue;
    const code = codeMatch[1];

    const budget = parseBudget(row[1]);
    const responsibleInternal = row[2] || "";
    const responsibleExternal = row[3] || "";
    const site = row[4] || "";
    const budgetApproved = parseBoolean(row[5]);
    const inProcess = parseBoolean(row[6]);
    const needsRevision = parseBoolean(row[7]);

    const responsible = responsibleInternal || responsibleExternal;
    const responsibleOrg = responsibleInternal
      ? "งานใต้ร่มพระบารมี"
      : "นอกกลุ่มแผนงานฯ";

    let status: SubProject["status"] = "pending";
    if (budgetApproved) status = "approved";
    else if (needsRevision) status = "revision";

    const contributions: IndicatorContribution[] = [];
    if (row[8]) contributions.push({ indicatorId: "kpi-10", target: parseInt(row[8]) || 1, actual: 0, unit: "เครือข่าย", description: row[8] });
    if (row[9]) contributions.push({ indicatorId: "kpi-35", target: parseInt(row[9]?.match(/(\d+)/)?.[1] || "5"), actual: 0, unit: "คน", description: row[9] });
    if (row[10]) contributions.push({ indicatorId: "kpi-36", target: parseInt(row[10]?.match(/(\d+)/)?.[1] || "1"), actual: 0, unit: "แหล่งเรียนรู้", description: row[10] });
    if (row[11]) contributions.push({ indicatorId: "kpi-40", target: parseInt(row[11]?.match(/(\d+)/)?.[1] || "1"), actual: 0, unit: "องค์ความรู้", description: row[11] });
    if (row[12]) contributions.push({ indicatorId: "kpi-39", target: parseInt(row[12]?.match(/(\d+)/)?.[1] || "1"), actual: 0, unit: "องค์ความรู้", description: row[12] });

    const name = findProjectName(rows, code);

    projects.push({
      id: `sp-pk-${code.replace(/\./g, "")}`,
      code,
      name: name || `โครงการพัฒนาคน ${code}`,
      mainProjectId: "mp-pk",
      budget,
      responsible,
      responsibleOrg,
      site,
      status,
      budgetApproved,
      inProcess,
      needsRevision,
      indicatorContributions: contributions,
    });
  }

  return projects;
}

// ดึงข้อมูลทุก sheet รวมกัน
export async function fetchAllProjects(): Promise<SubProject[]> {
  const [kk, pd, pk] = await Promise.all([
    fetchKabkleuan(),
    fetchPhlakdan(),
    fetchPattanakhon(),
  ]);
  return [...kk, ...pd, ...pk];
}
