"use client";

import React from "react";
import { CheckCircle2, Clock, Utensils, ShieldCheck, Sparkles, XCircle } from "lucide-react";

import { Booking } from "@/utils/data";

interface StatusStepperProps {
  status: Booking["status"];
}

const STEPS = [
  { id: "requested", label: "Inquiry Sent", icon: Clock },
  { id: "accepted", label: "Chef Matched", icon: CheckCircle2 },
  { id: "deposit", label: "Paid in Full (Escrow)", icon: ShieldCheck },
  { id: "prep", label: "Sourcing & Cooking", icon: Utensils },
  { id: "completed", label: "Dinner Served", icon: Sparkles },
];

export default function StatusStepper({ status }: StatusStepperProps) {
  if (
    status === "declined" ||
    status === "cancelled" ||
    status === "cancelled_by_chef" ||
    status === "cancelled_by_customer"
  ) {
    return (
      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
        <XCircle className="h-4 w-4 shrink-0 text-red-600" />
        <span>Booking Cancelled / Declined</span>
      </div>
    );
  }

  // Determine current active step index (0 to 4)
  let activeIndex = 0;
  if (status === "pending" || status === "pending_assignment") activeIndex = 0;
  else if (status === "chef_accepted" || status === "assigned" || status === "payment_pending") activeIndex = 1;
  else if (status === "confirmed") activeIndex = 2;
  else if (status === "in_progress" || status === "en_route" || status === "cooking") activeIndex = 3;
  else if (status === "completed") activeIndex = 4;

  return (
    <div className="w-full py-4 font-sans text-left">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-forest-100 z-0" />
        {/* Active track line */}
        <div
          className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-forest-900 transition-all duration-500 z-0"
          style={{ width: `${(activeIndex / (STEPS.length - 1)) * 92}%` }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? "bg-forest-900 text-white shadow-sm"
                    : isCurrent
                    ? "bg-forest-900 text-champagne-300 ring-4 ring-forest-100 shadow-md scale-110"
                    : "bg-white border-2 border-forest-200 text-forest-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={`text-[9px] mt-1.5 text-center font-bold tracking-tight max-w-[70px] hidden sm:block ${
                  isCurrent
                    ? "text-forest-950 font-black"
                    : isDone
                    ? "text-forest-700"
                    : "text-forest-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="sm:hidden text-center mt-2">
        <span className="text-xs font-bold text-forest-900">
          Stage: {STEPS[activeIndex]?.label}
        </span>
      </div>
    </div>
  );
}
