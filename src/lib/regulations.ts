export interface Regulation {
  id: string;
  title: string;
  category: "procurement" | "travel" | "hiring" | "budget" | "general";
  source: string;
  url: string;
  year: number;
  description?: string;
}

export interface Tip {
  id: string;
  category: "procurement" | "travel" | "hiring" | "budget";
  text: string;
  warning?: boolean; // true = ข้อควรระวัง, false = ข้อเสนอแนะ
}

export const categoryLabels: Record<string, string> = {
  procurement: "จัดซื้อจัดจ้าง/พัสดุ",
  travel: "เดินทางไปราชการ",
  hiring: "จ้างเหมาบริการ",
  budget: "งบประมาณ ง8/ง9",
  general: "ระเบียบทั่วไป",
};

export const regulations: Regulation[] = [
  // === จัดซื้อจัดจ้าง ===
  {
    id: "reg-01",
    title: "พ.ร.บ.การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560",
    category: "procurement",
    source: "ราชกิจจานุเบกษา",
    url: "https://www.cgd.go.th/cs/Satellite?blobcol=urldata&blobheadername1=Content-Type&blobheadervalue1=application%2Fpdf&blobkey=id&blobtable=MungoBlobs&blobwhere=1505790982291",
    year: 2560,
    description: "กฎหมายหลักว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ",
  },
  {
    id: "reg-02",
    title:
      "ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560",
    category: "procurement",
    source: "กรมบัญชีกลาง",
    url: "https://www.cgd.go.th/cs/internet/internet/กฎหมาย-ระเบียบ-และหนังสือเวียนที่เกี่ยวข้อง.html",
    year: 2560,
    description:
      "ระเบียบหลักการจัดซื้อจัดจ้าง วิธีเฉพาะเจาะจง วิธีคัดเลือก วิธี e-bidding",
  },
  {
    id: "reg-03",
    title:
      "กฎกระทรวง กำหนดวงเงินการจัดซื้อจัดจ้างพัสดุโดยวิธีเฉพาะเจาะจง พ.ศ. 2560",
    category: "procurement",
    source: "กรมบัญชีกลาง",
    url: "https://www.cgd.go.th/cs/internet/internet/กฎหมาย-ระเบียบ-และหนังสือเวียนที่เกี่ยวข้อง.html",
    year: 2560,
    description: "วงเงินไม่เกิน 500,000 บาท สามารถใช้วิธีเฉพาะเจาะจงได้",
  },
  {
    id: "reg-04",
    title: "แนวทางปฏิบัติในการจัดซื้อจัดจ้างผ่านระบบ e-GP",
    category: "procurement",
    source: "กรมบัญชีกลาง",
    url: "https://www.gprocurement.go.th",
    year: 2560,
    description: "ระบบจัดซื้อจัดจ้างภาครัฐด้วยอิเล็กทรอนิกส์",
  },

  // === เดินทางไปราชการ ===
  {
    id: "reg-10",
    title:
      "พระราชกฤษฎีกาค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. 2526 (แก้ไขเพิ่มเติมถึงฉบับที่ 9 พ.ศ. 2560)",
    category: "travel",
    source: "กระทรวงการคลัง",
    url: "https://www.cgd.go.th/cs/internet/internet/ค่าใช้จ่ายในการเดินทางไปราชการ.html",
    year: 2560,
    description:
      "อัตราค่าเบี้ยเลี้ยง ค่าที่พัก ค่าพาหนะในการเดินทางไปราชการ",
  },
  {
    id: "reg-11",
    title: "ระเบียบกระทรวงการคลังว่าด้วยการเบิกค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. 2550",
    category: "travel",
    source: "กระทรวงการคลัง",
    url: "https://www.cgd.go.th/cs/internet/internet/ค่าใช้จ่ายในการเดินทางไปราชการ.html",
    year: 2550,
    description: "หลักเกณฑ์การเบิกค่าใช้จ่ายในการเดินทางไปราชการ",
  },

  // === จ้างเหมาบริการ ===
  {
    id: "reg-20",
    title:
      "หลักเกณฑ์การเบิกจ่ายค่าจ้างเหมาบริการจากบุคคลธรรมดา",
    category: "hiring",
    source: "กรมบัญชีกลาง",
    url: "https://www.cgd.go.th",
    year: 2560,
    description:
      "แนวปฏิบัติการจ้างเหมาบริการบุคคลธรรมดา ขอบเขตงาน TOR สัญญาจ้าง",
  },
  {
    id: "reg-21",
    title: "หนังสือเวียน กค 0409.6/ว.67 การจ้างเหมาบริการ",
    category: "hiring",
    source: "กรมบัญชีกลาง",
    url: "https://www.cgd.go.th",
    year: 2553,
    description:
      "ข้อห้ามลักษณะการจ้างที่เป็นนายจ้าง-ลูกจ้าง ต้องกำหนดขอบเขตงานชัดเจน",
  },

  // === งบประมาณ ===
  {
    id: "reg-30",
    title: "ระเบียบว่าด้วยการบริหารงบประมาณ พ.ศ. 2562",
    category: "budget",
    source: "สำนักงบประมาณ",
    url: "https://www.bb.go.th/topic-detail.php?id=7422",
    year: 2562,
    description:
      "หลักเกณฑ์การใช้จ่ายงบประมาณ การโอนเปลี่ยนแปลง การกันเงินไว้เบิกเหลื่อมปี",
  },
  {
    id: "reg-31",
    title: "หลักการจำแนกประเภทรายจ่ายตามงบประมาณ",
    category: "budget",
    source: "สำนักงบประมาณ",
    url: "https://www.bb.go.th",
    year: 2562,
    description:
      "งบบุคลากร งบดำเนินงาน(ง8) งบลงทุน(ง9) งบเงินอุดหนุน งบรายจ่ายอื่น",
  },

  // === ระเบียบ มทร.ล้านนา ===
  {
    id: "reg-40",
    title: "ระเบียบ คำสั่ง ประกาศ กลุ่มแผนงานใต้ร่มพระบารมี",
    category: "general",
    source: "มทร.ล้านนา",
    url: "https://trpb.rmutl.ac.th/page/ระเบียบ-คำสั่ง-ประกาศ-กลุ่มแผนงานใต้ร่มพระบารมี",
    year: 2565,
    description: "คำสั่งแต่งตั้ง มอบหมายงาน ประกาศภายใน",
  },
];

export const tips: Tip[] = [
  // === จัดซื้อจัดจ้าง ===
  {
    id: "tip-01",
    category: "procurement",
    text: "จัดซื้อจัดจ้างไม่เกิน 500,000 บาท ใช้วิธีเฉพาะเจาะจงได้ แต่ต้องตรวจสอบราคากลางและมีเอกสารเปรียบเทียบราคา",
    warning: true,
  },
  {
    id: "tip-02",
    category: "procurement",
    text: "การซื้อวัสดุต้องผ่านระบบ e-GP ทุกครั้ง แม้วงเงินน้อย (ยกเว้นกรณีเร่งด่วนตามระเบียบ)",
    warning: true,
  },
  {
    id: "tip-03",
    category: "procurement",
    text: "ห้ามแบ่งซื้อแบ่งจ้าง เพื่อให้วงเงินต่ำกว่าเกณฑ์ ถือว่าผิดระเบียบ",
    warning: true,
  },

  // === เดินทางไปราชการ ===
  {
    id: "tip-10",
    category: "travel",
    text: "ต้องได้รับอนุมัติเดินทางก่อนวันเดินทาง และส่งเบิกค่าใช้จ่ายภายใน 15 วันหลังกลับ",
    warning: true,
  },
  {
    id: "tip-11",
    category: "travel",
    text: "ค่าที่พักเบิกได้ตามอัตราจริง แต่ไม่เกินอัตราที่กำหนด (ข้าราชการระดับปฏิบัติการ ไม่เกิน 1,500 บาท/คืน)",
    warning: false,
  },
  {
    id: "tip-12",
    category: "travel",
    text: "การใช้รถยนต์ส่วนตัวไปราชการ ต้องได้รับอนุมัติจากผู้มีอำนาจ และเบิกค่าชดเชยน้ำมันตามระยะทาง กม.ละ 4 บาท",
    warning: false,
  },

  // === จ้างเหมา ===
  {
    id: "tip-20",
    category: "hiring",
    text: "การจ้างเหมาบริการบุคคล ต้องจัดทำ TOR ขอบเขตงาน ห้ามมีลักษณะเป็นนายจ้าง-ลูกจ้าง (เช่น บังคับเวลาเข้า-ออก)",
    warning: true,
  },
  {
    id: "tip-21",
    category: "hiring",
    text: "สัญญาจ้างเหมาต้องระบุผลงานส่งมอบ (deliverables) ชัดเจน และตรวจรับงานตามงวดที่กำหนด",
    warning: false,
  },

  // === งบประมาณ ===
  {
    id: "tip-30",
    category: "budget",
    text: "งบ ง8 (งบดำเนินงาน) ใช้สำหรับค่าวัสดุ ค่าใช้สอย ค่าสาธารณูปโภค ห้ามนำไปซื้อครุภัณฑ์ (ใช้ ง9)",
    warning: true,
  },
  {
    id: "tip-31",
    category: "budget",
    text: "งบ ง9 (งบลงทุน) สิ่งของที่มีราคาตั้งแต่ 5,000 บาทขึ้นไป ถือเป็นครุภัณฑ์ ต้องลงทะเบียนและติดหมายเลข",
    warning: true,
  },
  {
    id: "tip-32",
    category: "budget",
    text: "การโอนเปลี่ยนแปลงงบประมาณข้ามหมวด ต้องได้รับอนุมัติจากผู้มีอำนาจก่อนดำเนินการ",
    warning: true,
  },
];
