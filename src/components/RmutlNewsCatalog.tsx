"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/tracker";
import type { NewsItem } from "@/lib/scraper";

/**
 * RmutlNewsCatalog v2 — uniform grid
 *
 * เปลี่ยนจาก v1 (1 hero + 4 small):
 *  - ทุก card ขนาดเท่ากัน (4 cols on desktop, 2 cols on tablet)
 *  - แสดง 8 ข่าว (ตาม API limit)
 *  - Card สมส่วน aspect-[4/3] รูป + body
 */
export default function RmutlNewsCatalog() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rmutl-news")
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            📰 ข่าวสารมหาวิทยาลัย
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (news.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            📰 University News
          </p>
          <h2 className="mt-0.5 text-lg sm:text-xl font-bold text-gray-800">
            ข่าวสาร · มทร.ล้านนา
          </h2>
        </div>
        <a
          href="https://www.rmutl.ac.th/news"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
          onClick={() => trackEvent("link_click", "/", "www.rmutl.ac.th/news")}
        >
          ดูทั้งหมด →
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {news.slice(0, 8).map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ring-1 ring-gray-100"
            onClick={() => trackEvent("rmutl_news_click", "/", item.title)}
          >
            {/* Image: uniform aspect */}
            {item.image ? (
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <span className="text-3xl">📄</span>
              </div>
            )}
            {/* Body — fixed height */}
            <div className="flex-1 p-2.5">
              {item.date && (
                <p className="text-[9px] text-gray-400 mb-0.5">{item.date}</p>
              )}
              <h3 className="line-clamp-3 text-[11px] sm:text-xs font-medium text-gray-800 leading-snug group-hover:text-blue-700 transition">
                {item.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
