import React from "react";
import { useNavigation } from "../context/NavigationContext";
import { CATEGORIES } from "../data/products";

export function CategoryChips() {
  const { navigate } = useNavigation();

  return (
    <section className="mt-6">
      <div className="mb-3 px-4">
        <h2 className="text-[17px] font-bold text-neutral-900">Shop by category</h2>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => navigate(`/category/${c.category}`)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center group cursor-pointer"
          >
            <span className="relative block h-16 w-16 overflow-hidden rounded-full bg-neutral-100 shadow-sm border border-neutral-200/60 transition-transform group-active:scale-95 group-hover:shadow-md">
              <img
                src={c.imageUrl}
                alt={c.categoryLabel}
                className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-300"
                loading="lazy"
              />
            </span>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-neutral-700 group-hover:text-black">
              {c.categoryLabel}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
