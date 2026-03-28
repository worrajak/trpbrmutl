// Client-side tracking helper
export async function trackEvent(
  event: string,
  page: string,
  target?: string
) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, page, target }),
    });
  } catch {
    // ไม่ block ถ้า tracking ล้มเหลว
  }
}
