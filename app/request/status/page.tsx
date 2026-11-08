"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import {
  ChefHat,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Calendar,
  MapPin,
  Users,
  Utensils,
  Send,
  Loader2,
  Car,
  CookingPot,
  ArrowRight,
} from "lucide-react";

interface BookingStatus {
  id: string;
  status: string;
  chef_id: string | null;
}

interface ChefInfo {
  name: string;
  avatar_url: string;
  phone: string;
  cuisines: string[];
  rating: number;
}

interface StatusResponse {
  success: boolean;
  booking: BookingStatus;
  chef: ChefInfo | null;
}

const STAGES = [
  { id: "received", step: 1, title: "Request received", icon: CheckCircle2 },
  { id: "matching", step: 2, title: "Finding your chef", icon: ChefHat },
  { id: "assigned", step: 3, title: "Chef assigned", icon: ChefHat },
  { id: "en_route", step: 4, title: "Chef en route", icon: Car },
  { id: "cooking", step: 5, title: "In your kitchen", icon: CookingPot },
];

function statusToStage(status: string): number {
  switch (status) {
    case "pending_assignment":
      return 2;
    case "assigned":
    case "chef_accepted":
    case "confirmed":
      return 3;
    case "en_route":
      return 4;
    case "cooking":
    case "in_progress":
      return 5;
    default:
      return 2;
  }
}

function StatusContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id") || "";
  // Only a full UUID can be polled. Older links carried a short reference, so
  // the effect below resolves those to the real row instead of polling a value
  // the API can never find.
  const bookingId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    rawId
  )
    ? rawId
    : "";
  // A link that only carries ?id= is still valid — derive the human reference
  // from it instead of rendering "No booking selected".
  const ref =
    searchParams.get("ref") || (bookingId ? bookingId.slice(0, 8).toUpperCase() : "");
  const name = searchParams.get("name") || "there";
  const queryCuisine = searchParams.get("cuisine") || "";
  const queryGuests = searchParams.get("guests") || "4";
  const queryDate = searchParams.get("date") || "";
  const queryLocation = searchParams.get("location") || "";

  const [currentStage, setCurrentStage] = useState(1);
  const [chef, setChef] = useState<ChefInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Tracking is account-only — bounce signed-out visitors to sign in.
  // If no booking ref was supplied, resolve their most recent booking so the
  // link is never a dead end.
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(
          `/request/status${window.location.search || ""}`
        )}`;
        return;
      }

      if (!bookingId) {
        try {
          // RLS already limits this to the caller's bookings. Fetch a page and
          // match the legacy short reference in memory: the id is a uuid
          // column, so a SQL prefix filter would need a cast PostgREST does not
          // reliably support.
          const { data: mine } = await supabase
            .from("bookings")
            .select("id")
            .or(`client_id.eq.${user.id},client_email.eq.${user.email}`)
            .order("created_at", { ascending: false })
            .limit(50);

          const prefix = ref.toLowerCase().replace(/[^0-9a-f]/g, "");
          let resolved: { id: string } | null = null;

          if (prefix.length >= 6) {
            const match = (mine || []).find((row: { id: string }) =>
              String(row.id).toLowerCase().startsWith(prefix)
            );
            if (match?.id) resolved = { id: match.id };
          }

          // No usable reference at all — fall back to the latest booking.
          if (!resolved && mine && mine.length > 0) {
            resolved = { id: mine[0].id };
          }

          if (resolved?.id) {
            const params = new URLSearchParams(window.location.search);
            params.set("id", resolved.id);
            params.set("ref", resolved.id.slice(0, 8).toUpperCase());
            window.location.replace(`/request/status?${params.toString()}`);
            return;
          }

          // Genuinely no bookings yet.
          window.location.replace("/dashboard");
          return;
        } catch {
          setLoading(false);
        }
      }

      setAuthChecked(true);
    }
    checkAuth();
  }, [bookingId, ref]);

  const fetchStatus = useCallback(async () => {
    // No pollable id — render the empty state instead of spinning forever.
    if (!bookingId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/dispatch/status?booking_id=${bookingId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: StatusResponse = await res.json();
      if (data.success) {
        setCurrentStage(statusToStage(data.booking.status));
        if (data.chef) setChef(data.chef);
      }
    } catch (err) {
      console.warn("[status] Poll error:", err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  // Reached without a booking reference — send them to their bookings list
  // rather than rendering an empty tracker.
  if (!ref) {
    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
        <Navbar />
        <main className="max-w-md mx-auto w-full px-4 pt-32 pb-20 flex-1 flex items-center">
          <div className="bg-white rounded-2xl border border-forest-100 p-8 text-center w-full">
            <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-6 w-6 text-forest-400" />
            </div>
            <h1 className="text-xl font-bold text-forest-950 mb-1">No booking selected</h1>
            <p className="text-sm text-forest-500 mb-6">
              Pick one of your bookings to see its live status.
            </p>
            <Link
              href="/dashboard"
              className="inline-block w-full py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
            >
              Go to my bookings
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const stageTitles = [
    "Request received",
    "Finding your chef…",
    "Chef assigned!",
    "Chef is on the way",
    "Chef is cooking",
  ];

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-forest-500 mb-2">
            <span className="font-mono font-medium">#{ref.slice(0, 8).toUpperCase()}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            {stageTitles[currentStage - 1]}
          </h1>
          <p className="mt-2 text-forest-500">
            {currentStage < 3
              ? `Hi ${name}, we're finding the best chef for your event in ${queryLocation}.`
              : `Great news! ${chef?.name || "A chef"} has been assigned to your event.`}
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl border border-forest-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            {STAGES.map((s, idx) => {
              const isPast = currentStage > s.step;
              const isCurrent = currentStage === s.step;
              const Icon = s.icon;

              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isPast
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-forest-950 text-white ring-4 ring-forest-950/10"
                          : "bg-cream-100 text-forest-400"
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`text-[10px] font-medium mt-2 text-center leading-tight ${
                        isCurrent ? "text-forest-950" : isPast ? "text-forest-700" : "text-forest-400"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-5 rounded-full ${
                        isPast ? "bg-emerald-500" : "bg-forest-100"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Matching State */}
        {currentStage === 2 && (
          <div className="bg-white rounded-2xl border border-forest-100 p-8 text-center mb-6">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full bg-champagne-400/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-forest-950 flex items-center justify-center">
                <ChefHat className="h-7 w-7 text-champagne-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-forest-950 mb-1">
              Contacting chefs in {queryLocation}…
            </h3>
            <p className="text-sm text-forest-500">
              We&apos;re checking availability for your {queryGuests}-guest event.
            </p>
          </div>
        )}

        {/* Chef Assigned Card */}
        {currentStage >= 3 && chef && (
          <div className="bg-white rounded-2xl border border-forest-100 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                <Image src={chef.avatar_url} alt={chef.name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-forest-950">{chef.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    Certified
                  </span>
                </div>
                <p className="text-sm text-forest-500">{chef.cuisines.join(", ")}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* No in-app chat. There is no message table and no realtime
                  channel behind it, so the old chat box only echoed the user's
                  own text with a scripted reply. WhatsApp is the channel that
                  actually reaches the chef. */}
              <a
                href={`https://wa.me/${
                  chef.phone
                    ? String(chef.phone).replace(/\D/g, "").replace(/^0/, "254")
                    : "254786530713"
                }?text=${encodeURIComponent(
                  `Hi ${chef.name}, I'm ${name}, your client for booking #${ref} on ${
                    queryDate || "my event"
                  }.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                {chef.phone ? "Message your chef" : "Message concierge"}
              </a>
              {chef.phone && (
                <a
                  href={`tel:${String(chef.phone).replace(/[^\d+]/g, "")}`}
                  className="py-2.5 px-4 rounded-xl border border-forest-200 text-forest-700 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
              <a
                href={`https://wa.me/254786530713?text=${encodeURIComponent(
                  `Hi Book A Chef, I need help with booking #${ref}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl border border-forest-200 text-forest-700 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center justify-center gap-2"
              >
                Concierge
              </a>
            </div>
          </div>
        )}

        {/* Event Summary */}
        <div className="bg-white rounded-2xl border border-forest-100 p-6 mb-6">
          <h3 className="text-sm font-bold text-forest-950 mb-4">Event details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-forest-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-forest-400 uppercase">Date</p>
                <p className="text-sm font-medium text-forest-950">{queryDate || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-forest-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-forest-400 uppercase">Guests</p>
                <p className="text-sm font-medium text-forest-950">{queryGuests}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center">
                <Utensils className="h-4 w-4 text-forest-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-forest-400 uppercase">Cuisine</p>
                <p className="text-sm font-medium text-forest-950">{queryCuisine || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-forest-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-forest-400 uppercase">Location</p>
                <p className="text-sm font-medium text-forest-950">{queryLocation || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — exits the tracker back into the account, not a dead end. */}
        <div className="flex items-center justify-between text-sm">
          <Link href="/request" className="text-forest-500 hover:text-forest-950 font-medium transition-colors">
            + New request
          </Link>
          <Link href="/dashboard" className="text-forest-950 hover:text-forest-700 font-medium transition-colors flex items-center gap-1">
            All bookings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}
