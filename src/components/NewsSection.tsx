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
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider">
            🗞 TRPB News
          </p>
          <h2 className="text-base sm:text-lg font-bold text-gray-800">
            ข่าวกลุ่มแผนงานใต้ร่มพระบารมี
          </h2>
        </div>
        <a
          href="https://trpb.rmutl.ac.th"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-purple-700 hover:text-purple-900 hover:underline"
          onClick={() => trackEvent("link_click", "/", "trpb.rmutl.ac.th")}
        >
          ดูทั้งหมด →
        </a>
      </div>

      {/* List style - single col (parent อาจ wrap เป็น 2-col layout) */}
      <div className="space-y-2">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-stretch gap-2 rounded-lg bg-white p-2 ring-1 ring-gray-100 hover:ring-purple-200 hover:shadow-sm transition"
            onClick={() => trackEvent("news_click", "/", item.title)}
          >
            {item.image ? (
              <div className="flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-md bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-md bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-lg">
                📰
              </div>
            )}
            <div className="flex-1 min-w-0">
              {item.date && (
                <p className="text-[9px] text-gray-400">{item.date}</p>
              )}
              <h3 className="line-clamp-2 text-[11px] sm:text-xs font-medium text-gray-800 leading-snug group-hover:text-purple-700 transition">
                {item.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
