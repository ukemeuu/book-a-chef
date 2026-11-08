"use client";

import {
  ChefAvailability,
  BlockedDate,
  DAY_LABELS,
} from "@/utils/marketplace";

interface AvailabilityCalendarProps {
  availability: ChefAvailability | null;
  blockedDates: BlockedDate[];
  busyDates?: string[];
}

/**
 * Read-only availability summary for a chef's public profile.
 *
 * Shows the weekly working pattern and any blocked dates in the next 60 days.
 * This is intentionally not an interactive calendar — the booking page uses
 * a date picker that consumes the same data.
 */
export default function AvailabilityCalendar({
  availability,
  blockedDates,
  busyDates = [],
}: AvailabilityCalendarProps) {
  const workingDays = availability?.working_days || [];
  const upcomingBlocked = blockedDates.filter((b) => {
    const d = new Date(b.blocked_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = d.getTime() - now.getTime();
    return diff >= 0 && diff < 60 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-5">
      {/* Weekly pattern */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-forest-500 mb-2">
          Working days
        </p>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const isWorking = workingDays.includes(i);
            return (
              <div
                key={label}
                className={`flex-1 py-2 rounded-lg text-center text-xs font-medium ${
                  isWorking
                    ? "bg-forest-950 text-white"
                    : "bg-cream-100 text-forest-400"
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>
        {availability && (
          <p className="mt-2 text-xs text-forest-500">
            {availability.start_time?.slice(0, 5)} –{" "}
            {availability.end_time?.slice(0, 5)} • Max{" "}
            {availability.max_bookings_per_day} booking
            {availability.max_bookings_per_day === 1 ? "" : "s"}/day
          </p>
        )}
      </div>

      {/* Blocked dates */}
      {upcomingBlocked.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-forest-500 mb-2">
            Unavailable dates
          </p>
          <div className="flex flex-wrap gap-1.5">
            {upcomingBlocked.map((b) => (
              <span
                key={b.blocked_date}
                className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
                title={b.reason || "Unavailable"}
              >
                {new Date(b.blocked_date).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Busy dates */}
      {busyDates.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-forest-500 mb-2">
            Already booked
          </p>
          <div className="flex flex-wrap gap-1.5">
            {busyDates.slice(0, 10).map((d) => (
              <span
                key={d}
                className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
              >
                {new Date(d).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ))}
            {busyDates.length > 10 && (
              <span className="px-2.5 py-1 text-xs text-forest-400">
                +{busyDates.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
