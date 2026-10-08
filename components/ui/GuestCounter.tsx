"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";

interface GuestCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  sublabel?: string;
  compact?: boolean;
}

export default function GuestCounter({
  value,
  onChange,
  min = 2,
  max = 40,
  label = "Dinner Guests",
  sublabel = "Ages 12+",
  compact = false,
}: GuestCounterProps) {
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value < max) {
      onChange(value + 1);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label="Decrease guests"
          className="h-7 w-7 rounded-full border border-forest-200 bg-white flex items-center justify-center text-forest-800 hover:border-forest-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="font-bold text-sm text-forest-950 w-5 text-center">{value}</span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label="Increase guests"
          className="h-7 w-7 rounded-full border border-forest-200 bg-white flex items-center justify-center text-forest-800 hover:border-forest-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="block text-sm font-bold text-forest-950">{label}</span>
        {sublabel && <span className="block text-xs text-forest-500 font-medium">{sublabel}</span>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label="Decrease guests"
          className="h-8 w-8 rounded-full border border-forest-300 bg-white flex items-center justify-center text-forest-800 hover:border-forest-900 hover:bg-forest-50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="font-bold text-base text-forest-950 min-w-[24px] text-center">{value}</span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label="Increase guests"
          className="h-8 w-8 rounded-full border border-forest-300 bg-white flex items-center justify-center text-forest-800 hover:border-forest-900 hover:bg-forest-50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
