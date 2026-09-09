import React, { type ReactNode } from "react";
import { useNavigation } from "../context/NavigationContext";

export function EmptyState({
  icon,
  headline,
  subtext,
  ctaLabel,
  ctaHref,
}: {
  icon?: ReactNode;
  headline: string;
  subtext: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const { navigate } = useNavigation();

  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      {icon ? (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl shadow-inner">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-bold text-neutral-900">{headline}</p>
      <p className="mt-1.5 max-w-[240px] text-sm text-neutral-500 leading-relaxed">{subtext}</p>
      {ctaLabel && ctaHref ? (
        <button
          type="button"
          onClick={() => navigate(ctaHref)}
          className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-neutral-800 transition-colors"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
