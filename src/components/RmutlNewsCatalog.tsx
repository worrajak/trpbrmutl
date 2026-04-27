"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/tracker";
import type { NewsItem } from "@/lib/scraper";

/**
 * RmutlNewsCatalog — ข่าวจาก www.rmutl.ac.th แบบ catalog grid
 *
 * ดีไซน์ต่างจาก NewsSection (trpb) — เน้น 2-column hero card + กริดเล็ก
 * รูปจาก e-cms.rmutl.ac.th
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            📰 ข่าวสารมหาวิทยาลัย
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (news.length === 0) return null;

  const [hero, ...rest] = news;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            📰 University News
          </p>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-800">
            ข่าวสาร · มทร.ล้านนา
          </h2>
        </div>
        <a
          href="https://www.rmutl.ac.th/news"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
          onClick={() => trackEvent("link_click", "/", "www.rmutl.ac.th/news")}
        >
          ดูทั้งหมด →
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero card - large */}
        <a
          href={hero.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all"
          onClick={() => trackEvent("rmutl_news_click", "/", hero.title)}
        >
          {hero.image ? (
            <div className="aspect-[16/9] overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.image}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <span className="text-6xl">📰</span>
            </div>
          )}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5">
                ข่าวเด่น
              </span>
              {hero.date && (
                <span className="text-[10px] text-gray-500">{hero.date}</span>
              )}
            </div>
            <h3 className="mt-2 line-clamp-3 text-base sm:text-lg font-bold text-gray-800 group-hover:text-blue-700 transition">
              {hero.title}
            </h3>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
              อ่านต่อ <span className="transition group-hover:translate-x-1">→</span>
            </p>
          </div>
        </a>

        {/* Smaller cards */}
        {rest.slice(0, 4).map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 ring-1 ring-gray-100"
            onClick={() => trackEvent("rmutl_news_click", "/", item.title)}
          >
            <div className="flex gap-3 p-3">
              {item.image ? (
                <div className="flex-shrink-0 h-16 w-20 sm:h-20 sm:w-24 overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 h-16 w-20 sm:h-20 sm:w-24 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                {item.date && (
                  <p className="text-[10px] text-gray-400">{item.date}</p>
                )}
                <h3 className="line-clamp-3 text-xs sm:text-sm font-medium text-gray-800 group-hover:text-blue-700 transition">
                  {item.title}
                </h3>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
