export interface NewsItem {
  title: string;
  url: string;
  date: string;
  image?: string;
}

export async function scrapeNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch("https://trpb.rmutl.ac.th", {
      next: { revalidate: 3600 }, // cache 1 ชั่วโมง
    });
    if (!res.ok) return [];

    const html = await res.text();
    const news: NewsItem[] = [];

    // หา block ข่าวจาก HTML
    // pattern: <a href="/news/xxxxx-xxxxx"> ... title ... </a>
    const linkPattern =
      /<a[^>]*href="(\/news\/[\d-]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null && news.length < 5) {
      const url = `https://trpb.rmutl.ac.th${match[1]}`;
      const inner = match[2];

      // ดึง title จากข้อความใน tag
      const titleMatch = inner.match(
        /<(?:h[1-6]|p|span|div)[^>]*class="[^"]*(?:title|heading|card-title)[^"]*"[^>]*>([\s\S]*?)<\/(?:h[1-6]|p|span|div)>/i
      );
      let title = "";
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
      } else {
        // fallback: ดึงข้อความยาวที่สุดที่ไม่ใช่ tag
        const textParts = inner
          .replace(/<[^>]*>/g, "\n")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 10);
        title = textParts[0] || "";
      }

      if (!title) continue;

      // ดึงรูปภาพ
      const imgMatch = inner.match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
      const image = imgMatch ? imgMatch[1] : undefined;

      // ดึงวันที่
      const dateMatch = inner.match(
        /(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*\d{2,4})/
      );
      const date = dateMatch ? dateMatch[1] : "";

      // ตรวจซ้ำ
      if (!news.some((n) => n.url === url)) {
        news.push({ title, url, date, image });
      }
    }

    // ถ้า pattern แรกไม่ได้ผล ลองอีก pattern
    if (news.length === 0) {
      const altPattern =
        /href="(https?:\/\/trpb\.rmutl\.ac\.th\/news\/[^"]+)"[^>]*>/gi;
      let altMatch;
      const urls: string[] = [];
      while (
        (altMatch = altPattern.exec(html)) !== null &&
        urls.length < 5
      ) {
        if (!urls.includes(altMatch[1])) {
          urls.push(altMatch[1]);
        }
      }

      for (const newsUrl of urls) {
        // ค้นหาข้อความรอบ ๆ ลิงก์
        const idx = html.indexOf(newsUrl);
        const context = html.substring(
          Math.max(0, idx - 500),
          Math.min(html.length, idx + 500)
        );

        const ctxTitle = context
          .replace(/<[^>]*>/g, "\n")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 15 && !s.startsWith("http"));

        news.push({
          title: ctxTitle[0] || "ข่าวจากกลุ่มแผนงานใต้ร่มพระบารมี",
          url: newsUrl,
          date: "",
        });
      }
    }

    return news.slice(0, 5);
  } catch {
    return [];
  }
}
