"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Utensils } from "lucide-react";
import { MarketplaceMenu, formatPrice } from "@/utils/marketplace";

interface MenuCardProps {
  menu: MarketplaceMenu;
  onSelect?: () => void;
  selected?: boolean;
  selectable?: boolean;
}

/**
 * A chef's menu card. Shows courses (appetizer, main, dessert) with pricing.
 * Can be rendered as a selectable card for the booking flow.
 */
export default function MenuCard({
  menu,
  onSelect,
  selected,
  selectable,
}: MenuCardProps) {
  const [expanded, setExpanded] = useState(false);

  const courses = [
    menu.courses?.appetizer,
    menu.courses?.main,
    menu.courses?.dessert,
  ].filter(Boolean);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        selected
          ? "border-forest-950 bg-forest-50/50 ring-1 ring-forest-950"
          : "border-forest-100 bg-white hover:border-forest-200"
      } ${selectable ? "cursor-pointer" : ""}`}
      onClick={handleClick}
      role={selectable ? "button" : undefined}
      aria-pressed={selectable ? selected : undefined}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {menu.tag && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-champagne-100 text-champagne-800 text-[10px] font-bold uppercase tracking-wide mb-1.5">
                {menu.tag}
              </span>
            )}
            <h3 className="font-bold text-forest-950">{menu.title}</h3>
            {menu.description && (
              <p className="text-xs text-forest-500 mt-1 line-clamp-2">
                {menu.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-forest-950">
              {formatPrice(menu.price_per_guest)}
            </p>
            <p className="text-[10px] text-forest-400">per guest</p>
          </div>
        </div>

        {/* Course preview */}
        {courses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-forest-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Utensils className="h-3.5 w-3.5 text-forest-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-500">
                Courses
              </span>
            </div>
            <div className="space-y-1.5">
              {(expanded ? courses : courses.slice(0, 1)).map(
                (course: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-champagne-700 uppercase w-16 shrink-0 pt-0.5">
                      {i === 0 ? "Starter" : i === 1 ? "Main" : "Dessert"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-forest-900">
                        {course.name}
                      </p>
                      {course.description && (
                        <p className="text-[11px] text-forest-500 line-clamp-1">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
            {courses.length > 1 && !selectable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((prev) => !prev);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-forest-600 hover:text-forest-950 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    All {courses.length} courses
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {selectable && selected && (
          <div className="mt-4 pt-4 border-t border-forest-100">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-950">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Selected menu
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
