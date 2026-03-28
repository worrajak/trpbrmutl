"use client";

import { trackEvent } from "@/lib/tracker";

interface TrackedLinkProps {
  href: string;
  children: React.ReactNode;
  label: string;
  page: string;
  className?: string;
}

export default function TrackedLink({
  href,
  children,
  label,
  page,
  className,
}: TrackedLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackEvent("link_click", page, label)}
    >
      {children}
    </a>
  );
}
