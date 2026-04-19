"use client";

import { useEffect, useState } from "react";

interface FeedReport {
  id: string;
  project_id: string;
  submitted_at: string;
  submitted_by: string;
  report_description: string | null;
  images: Array<{ name?: string; url: string; type: string }>;
  activities: { activity_name: string; activity_order: number } | null;
  projects: {
    project_name: string;
    main_program: string;
    organization: string | null;
  } | null;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 1000 / 3600;
  if (diffH < 1) return "เมื่อครู่";
  if (diffH < 24) return `${Math.floor(diffH)} ชม.ที่แล้ว`;
  const diffD = diffH / 24;
  if (diffD < 7) return `${Math.floor(diffD)} วันที่แล้ว`;
  if (diffD < 30) return `${Math.floor(diffD / 7)} สัปดาห์ก่อน`;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function LatestReportsFeed({ limit = 8 }: { limit?: number }) {
  const [reports, setReports] = useState<FeedReport[] | null>(null);

  useEffect(() => {
    fetch(`/api/supabase/latest-reports?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setReports(d.reports || []))
      .catch(() => setReports([]));
  }, [limit]);

  if (reports === null) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-center text-sm text-gray-400">กำลังโหลด...</p>
      </div>
    );
  }

  if (reports.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          📸 รายงานล่าสุด
        </h2>
        <a href="/projects" className="text-xs text-royal-600 hover:underline">
          ดูทั้งหมด →
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {reports.map((r) => {
          const firstImg = r.images[0];
          return (
            <a
              key={r.id}
              href={`/projects/${r.project_id}`}
              className="group overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firstImg.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                {r.images.length > 1 && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    +{r.images.length - 1}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {formatRelativeTime(r.submitted_at)}
                </span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs font-medium text-gray-800">
                  {r.projects?.project_name || "โครงการ"}
                </p>
                {r.activities && (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">
                    #{r.activities.activity_order} {r.activities.activity_name}
                  </p>
                )}
                {r.report_description && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">
                    {r.report_description}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-400">
                  โดย {r.submitted_by}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
