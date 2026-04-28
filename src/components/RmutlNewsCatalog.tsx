"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/tracker";
import type { NewsItem } from "@/lib/scraper";

/**
 * RmutlNewsCatalog v3 — แถบ list แบบ news ticker
 *
 * เปลี่ยนจาก v2 (4-col grid):
 *  - List เล็ก ๆ · thumbnail ซ้าย + title ขวา
 *  - 2 cols (desktop) · 1 col (mobile) — แสดง 8 items ในที่เดียวกับ grid 2 rows
 *  - Compact — สูงต่อ item ~64px
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
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-800">
            📰 ข่าวสาร · มทร.ล้านนา
          </h2>
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (news.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">
            📰 University News
          </p>
          <h2 className="text-base sm:text-lg font-bold text-gray-800">
            ข่าวสาร · มทร.ล้านนา
          </h2>
        </div>
        <a
          href="https://www.rmutl.ac.th/news"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
          onClick={() => trackEvent("link_click", "/", "www.rmutl.ac.th/news")}
        >
          ดูทั้งหมด →
        </a>
      </div>

      {/* List style - single col (parent อาจ wrap เป็น 2-col layout) */}
      <div className="space-y-2">
        {news.slice(0, 8).map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-stretch gap-2 rounded-lg bg-white p-2 ring-1 ring-gray-100 hover:ring-blue-200 hover:shadow-sm transition"
            onClick={() => trackEvent("rmutl_news_click", "/", item.title)}
          >
            {/* Thumbnail - small square */}
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
              <div className="flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-md bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-lg">
                📄
              </div>
            )}
            {/* Body */}
            <div className="flex-1 min-w-0">
              {item.date && (
                <p className="text-[9px] text-gray-400">{item.date}</p>
              )}
              <h3 className="line-clamp-2 text-[11px] sm:text-xs font-medium text-gray-800 leading-snug group-hover:text-blue-700 transition">
                {item.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
