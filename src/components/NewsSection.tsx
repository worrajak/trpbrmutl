"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/tracker";
import type { NewsItem } from "@/lib/scraper";

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        setNews(data.news || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          ข่าวล่าสุดจากกลุ่มแผนงานใต้ร่มพระบารมี
        </h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          ข่าวล่าสุดจากกลุ่มแผนงานใต้ร่มพระบารมี
        </h2>
        <a
          href="https://trpb.rmutl.ac.th"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-royal-600 hover:underline"
          onClick={() =>
            trackEvent("link_click", "/", "trpb.rmutl.ac.th")
          }
        >
          ดูทั้งหมด &rarr;
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-lg bg-white p-4 shadow transition hover:shadow-md"
            onClick={() =>
              trackEvent("news_click", "/", item.title)
            }
          >
            {item.image && (
              <div className="mb-2 h-24 overflow-hidden rounded bg-gray-100">
                <img
                  src={item.image}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
            )}
            <h3 className="text-xs font-medium leading-tight text-gray-800 group-hover:text-royal-600">
              {item.title.length > 80
                ? item.title.substring(0, 80) + "..."
                : item.title}
            </h3>
            {item.date && (
              <p className="mt-1 text-[10px] text-gray-400">{item.date}</p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
