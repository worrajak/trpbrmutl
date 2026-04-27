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
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
            🗞 TRPB News
          </p>
          <h2 className="mt-0.5 text-lg sm:text-xl font-bold text-gray-800">
            ข่าวกลุ่มแผนงานใต้ร่มพระบารมี
          </h2>
        </div>
        <a
          href="https://trpb.rmutl.ac.th"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition"
          onClick={() => trackEvent("link_click", "/", "trpb.rmutl.ac.th")}
        >
          ดูทั้งหมด →
        </a>
      </div>
      {/* Uniform grid - same shape as RmutlNewsCatalog */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ring-1 ring-gray-100"
            onClick={() => trackEvent("news_click", "/", item.title)}
          >
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
              <div className="aspect-[4/3] bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <span className="text-3xl">📰</span>
              </div>
            )}
            <div className="flex-1 p-2.5">
              {item.date && (
                <p className="text-[9px] text-gray-400 mb-0.5">{item.date}</p>
              )}
              <h3 className="line-clamp-3 text-[11px] sm:text-xs font-medium text-gray-800 leading-snug group-hover:text-purple-700 transition">
                {item.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
