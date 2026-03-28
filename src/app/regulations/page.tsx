"use client";

import { useEffect } from "react";
import {
  regulations,
  tips,
  categoryLabels,
} from "@/lib/regulations";
import TrackedLink from "@/components/TrackedLink";
import { trackEvent } from "@/lib/tracker";

const categories = ["procurement", "travel", "hiring", "budget", "general"] as const;

export default function RegulationsPage() {
  useEffect(() => {
    trackEvent("page_view", "/regulations");
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">
          ระเบียบ ประกาศ และข้อควรระวัง
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          ระเบียบสำคัญที่เกี่ยวข้องกับการดำเนินงานโครงการ ง8/ง9
          พร้อมข้อควรระวังในการปฏิบัติงาน
        </p>
      </div>

      {/* Tips ข้อควรระวัง */}
      <section className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-yellow-800">
          ข้อควรระวังในการดำเนินงาน ง8/ง9
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(["procurement", "travel", "hiring", "budget"] as const).map(
            (cat) => {
              const catTips = tips.filter((t) => t.category === cat);
              if (catTips.length === 0) return null;
              return (
                <div key={cat} className="rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">
                    {categoryLabels[cat]}
                  </h3>
                  <ul className="space-y-2">
                    {catTips.map((tip) => (
                      <li key={tip.id} className="flex gap-2 text-sm">
                        <span className="mt-0.5 flex-shrink-0">
                          {tip.warning ? (
                            <span className="text-red-500" title="ข้อควรระวัง">&#9888;</span>
                          ) : (
                            <span className="text-blue-500" title="ข้อเสนอแนะ">&#9432;</span>
                          )}
                        </span>
                        <span className="text-gray-700">{tip.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* ลิงก์ระเบียบแบ่งตามหมวด */}
      {categories.map((cat) => {
        const regs = regulations.filter((r) => r.category === cat);
        if (regs.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              {categoryLabels[cat]}
            </h2>
            <div className="space-y-3">
              {regs.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-lg bg-white p-4 shadow transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <TrackedLink
                        href={reg.url}
                        label={reg.title}
                        page="/regulations"
                        className="font-medium text-royal-600 hover:underline"
                      >
                        {reg.title}
                      </TrackedLink>
                      {reg.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {reg.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {reg.source}
                      </span>
                      <p className="mt-1 text-xs text-gray-400">
                        พ.ศ. {reg.year}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
