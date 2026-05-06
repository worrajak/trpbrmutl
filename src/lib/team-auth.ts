/**
 * team-auth — utilities สำหรับระบบ admin คณะทำงานใต้ร่มพระบารมี
 *
 * Token format: alphanumeric uppercase 6-8 chars (เช่น PIMOL01)
 * PIN: 4 digits (เช่น 1234)
 * Hash: SHA-256(pin + ":" + token) — token ใช้เป็น salt
 *
 * Note ความปลอดภัย:
 *  - PIN 4 หลัก = 10,000 combinations เท่านั้น
 *  - ในการใช้งานจริงต้องมี rate limit + lockout (TODO ภายหลัง)
 *  - production ควรเปลี่ยนเป็น bcrypt + service_role key
 */

/** Hash PIN ด้วย SHA-256 (use Web Crypto API — ทำงานทั้ง Edge + Node) */
export async function hashPin(pin: string, token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + ":" + token);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** เปรียบเทียบ PIN กับ hash ที่เก็บใน DB */
export async function verifyPin(pin: string, token: string, storedHash: string): Promise<boolean> {
  const computed = await hashPin(pin, token);
  return computed === storedHash;
}

/** Validate token format (alphanumeric uppercase 6-8 chars) */
export function isValidToken(token: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(token);
}

/** Validate PIN format (4 digits) */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Thai consonants → English transliteration (basic, first-letter only)
 * ใช้ tuple array + Map เพื่อหลบ combining characters ที่ทำให้ TypeScript parser พัง
 */
const THAI_TO_ENG: Map<string, string> = new Map([
  // พยัญชนะหลัก (เน้น first-letter sound)
  ["ก", "K"], ["ข", "K"], ["ฃ", "K"], ["ค", "K"], ["ฅ", "K"], ["ฆ", "K"],
  ["ง", "N"], ["จ", "C"], ["ฉ", "C"], ["ช", "C"], ["ซ", "S"], ["ฌ", "C"],
  ["ญ", "Y"], ["ฎ", "D"], ["ฏ", "T"], ["ฐ", "T"], ["ฑ", "T"], ["ฒ", "T"],
  ["ณ", "N"], ["ด", "D"], ["ต", "T"], ["ถ", "T"], ["ท", "T"], ["ธ", "T"],
  ["น", "N"], ["บ", "B"], ["ป", "P"], ["ผ", "P"], ["ฝ", "F"], ["พ", "P"],
  ["ฟ", "F"], ["ภ", "P"], ["ม", "M"], ["ย", "Y"], ["ร", "R"], ["ล", "L"],
  ["ว", "W"], ["ศ", "S"], ["ษ", "S"], ["ส", "S"], ["ห", "H"], ["ฬ", "L"],
  ["อ", "A"], ["ฮ", "H"],
]);

/**
 * แนะ token จากชื่อ — ตัด prefix นาย/นาง/ฯลฯ
 * ใช้ first letter ของ 5 พยัญชนะแรก + 2 digits random
 *
 * Examples:
 *   "นางสาวพิมลพรรณ" → "PMLPR42"
 *   "นายวัชระ"      → "WCR07"  (พยัญชนะ ว-ช-ร)
 *   ภาษาอังกฤษล้วน  → take first 5 chars + random
 */
export function suggestToken(thaiName: string): string {
  // ตัด prefix ภาษาไทย
  const cleaned = thaiName
    .replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.|ผศ\.|รศ\.|ศ\.|อ\.|อาจารย์|ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์)\s*/g, "")
    .trim();

  // กรองเฉพาะ char ที่ใช้ — ตัด vowel marks/tone marks ออก เก็บเฉพาะพยัญชนะ + a-z 0-9
  let initials = "";
  for (const ch of cleaned) {
    if (initials.length >= 5) break;
    if (THAI_TO_ENG.has(ch)) {
      initials += THAI_TO_ENG.get(ch)!;
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      initials += ch.toUpperCase();
    }
    // skip อื่นๆ (vowels, marks, spaces, punctuation)
  }

  const prefix = initials.substring(0, 5) || "TEAM";
  const random = Math.floor(Math.random() * 99).toString().padStart(2, "0");
  return prefix + random;
}

/** Generate random token (fallback ถ้าไม่อยากใช้ชื่อ) */
export function generateRandomToken(length = 7): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // เอา 0/1/I/O/L ออก กันสับสน
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
