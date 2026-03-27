// พิกัด GPS พื้นที่โครงการหลวงและพื้นที่ดำเนินงาน
// ข้อมูลจาก Google Maps / ข้อมูลสาธารณะ

export interface ProjectLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  province: string;
  // รหัสโครงการย่อยที่ดำเนินงานในพื้นที่นี้
  subProjectIds: string[];
}

export const locations: ProjectLocation[] = [
  // ===== ศูนย์พัฒนาโครงการหลวง =====
  {
    id: "loc-khunpae",
    name: "ศูนย์พัฒนาโครงการหลวงขุนแปะ",
    lat: 18.5133,
    lng: 98.4667,
    province: "เชียงใหม่",
    subProjectIds: ["sp-swps-24"],
  },
  {
    id: "loc-thungluang",
    name: "ศูนย์พัฒนาโครงการหลวงทุ่งหลวง",
    lat: 18.6500,
    lng: 98.1333,
    province: "เชียงใหม่",
    subProjectIds: ["sp-swps-12"],
  },
  {
    id: "loc-thungroeng",
    name: "ศูนย์พัฒนาโครงการหลวงทุ่งเริง",
    lat: 18.6167,
    lng: 98.8000,
    province: "เชียงใหม่",
    subProjectIds: [],
  },
  {
    id: "loc-nongkhiaw",
    name: "ศูนย์พัฒนาโครงการหลวงหนองเขียว",
    lat: 19.3667,
    lng: 98.9667,
    province: "เชียงใหม่",
    subProjectIds: ["sp-swps-25"],
  },
  {
    id: "loc-pangkha",
    name: "ศูนย์พัฒนาโครงการหลวงปังค่า",
    lat: 19.2833,
    lng: 100.2333,
    province: "พะเยา",
    subProjectIds: [],
  },
  {
    id: "loc-phatang",
    name: "ศูนย์พัฒนาโครงการหลวงผาตั้ง",
    lat: 20.2167,
    lng: 100.3167,
    province: "เชียงราย",
    subProjectIds: [],
  },
  {
    id: "loc-prabat",
    name: "ศูนย์พัฒนาโครงการหลวงพระบาทห้วยต้ม",
    lat: 18.3500,
    lng: 98.6667,
    province: "ลำพูน",
    subProjectIds: [],
  },
  {
    id: "loc-maesanaam",
    name: "ศูนย์พัฒนาโครงการหลวงแม่สาใหม่",
    lat: 18.9500,
    lng: 98.8833,
    province: "เชียงใหม่",
    subProjectIds: ["sp-swps-23"],
  },
  {
    id: "loc-mokjam",
    name: "ศูนย์พัฒนาโครงการหลวงหมอกจ๋าม",
    lat: 19.5000,
    lng: 98.4833,
    province: "เชียงใหม่",
    subProjectIds: ["sp-swps-14"],
  },
  {
    id: "loc-huaynamrin",
    name: "ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน",
    lat: 19.3333,
    lng: 99.4000,
    province: "เชียงราย",
    subProjectIds: ["sp-swps-21", "sp-swps-22"],
  },
  {
    id: "loc-huaypong",
    name: "ศูนย์พัฒนาโครงการหลวงห้วยโป่ง",
    lat: 19.3500,
    lng: 99.4333,
    province: "เชียงราย",
    subProjectIds: [],
  },
  {
    id: "loc-pangda",
    name: "สถานีเกษตรหลวงปางดะ",
    lat: 18.7167,
    lng: 98.7833,
    province: "เชียงใหม่",
    subProjectIds: ["sp-swps-11"],
  },
  {
    id: "loc-chonnakathip",
    name: "ศูนย์วิจัยและพัฒนาการเกษตรโครงการหลวงชนกาธิเบศรดำริ",
    lat: 18.8833,
    lng: 98.8500,
    province: "เชียงใหม่",
    subProjectIds: [],
  },
  {
    id: "loc-jakkaphan",
    name: "ศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ",
    lat: 20.4333,
    lng: 99.8833,
    province: "เชียงราย",
    subProjectIds: ["sp-3121", "sp-3135"],
  },
  // ===== พื้นที่ดำเนินงานนอกโครงการหลวง =====
  {
    id: "loc-doisaket",
    name: "ศูนย์ฯเรียนรู้เศรษฐกิจพอเพียง ดอยสะเก็ด",
    lat: 18.8667,
    lng: 99.0667,
    province: "เชียงใหม่",
    subProjectIds: ["sp-3131"],
  },
  {
    id: "loc-rmutl-cm",
    name: "วิทยาลัยฯ มทร.ล้านนา เชียงใหม่",
    lat: 18.7960,
    lng: 98.9717,
    province: "เชียงใหม่",
    subProjectIds: ["sp-3111"],
  },
  {
    id: "loc-ceramic",
    name: "ศูนย์เรียนรู้เซรามิก",
    lat: 18.7883,
    lng: 99.0067,
    province: "เชียงใหม่",
    subProjectIds: ["sp-3112", "sp-3113"],
  },
  {
    id: "loc-rmutl-cr",
    name: "มทร.ล้านนา เชียงราย",
    lat: 19.9050,
    lng: 99.8317,
    province: "เชียงราย",
    subProjectIds: ["sp-5111"],
  },
  {
    id: "loc-nan",
    name: "มทร.ล้านนา น่าน / พระตำหนักธงน้อย",
    lat: 18.7800,
    lng: 100.7833,
    province: "น่าน",
    subProjectIds: ["sp-5112", "sp-5113", "sp-5114"],
  },
  {
    id: "loc-phitsanulok",
    name: "พื้นที่ดำเนินงาน จ.พิษณุโลก",
    lat: 16.8211,
    lng: 100.2659,
    province: "พิษณุโลก",
    subProjectIds: ["sp-3114", "sp-3117"],
  },
  {
    id: "loc-sukhothai",
    name: "ต.เกาะตาเลี้ยง อ.ศรีสำโรง จ.สุโขทัย",
    lat: 17.1500,
    lng: 99.8667,
    province: "สุโขทัย",
    subProjectIds: ["sp-3116"],
  },
];
