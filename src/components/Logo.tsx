"use client";

interface Props {
  className?: string;
  alt?: string;
}

export default function Logo({ className = "h-12 w-auto", alt = "ใต้ร่มพระบารมี" }: Props) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
