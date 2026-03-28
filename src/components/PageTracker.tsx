"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/tracker";

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent("page_view", pathname);
  }, [pathname]);

  return null;
}
