"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ChefHat,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Utensils,
  ArrowRight,
  ShieldCheck,
  Star,
  Car,
  CookingPot,
  Send,
  Loader2,
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

interface DispatchInfo {
  matched_at: string;
  match_score: number;
  auto_assigned: boolean;
}

interface StatusResponse {
  success: boolean;
  booking: BookingStatus;
  chef: ChefInfo | null;
  dispatch: DispatchInfo | null;
}

const STAGES = [
  { id: "received", step: 1, title: "Request Received", icon: CheckCircle2 },
  { id: "matching", step: 2, title: "Finding Your Chef…", icon: Sparkles },
  { id: "assigned", step: 3, title: "Chef Assigned", icon: ChefHat },
  { id: "en_route", step: 4, title: "Chef En Route", icon: Car },
  { id: "cooking", step: 5, title: "In Your Kitchen", icon: CookingPot },
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
  const ref = searchParams.get("ref") || "";
  const name = searchParams.get("name") || "Valued Diner";
  const queryCuisine = searchParams.get("cuisine") || "Fine Dining";
  const queryGuests = searchParams.get("guests") || "4";
  const queryDate = searchParams.get("date") || "";
  const queryLocation = searchParams.get("location") || "Nairobi – Westlands";

  const [currentStage, setCurrentStage] = useState(1);
  const [pulse, setPulse] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chef, setChef] = useState<ChefInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!ref) return;
    try {
      const res = await fetch(`/api/dispatch/status?booking_id=${ref}`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const data: StatusResponse = await res.json();

      if (data.success) {
        setCurrentStage(statusToStage(data.booking.status));
        if (data.chef) {
          setChef(data.chef);
          // Add chef message when first assigned
          if (data.booking.status === "assigned" || data.booking.status === "chef_accepted") {
            setChatMessages((prev) => {
              if (prev.some((m) => m.sender === "chef")) return prev;
              return [
                ...prev,
                {
                  sender: "chef",
                  text: `Hi ${name}! I'm ${data.chef!.name}. I've accepted your private dining booking for ${queryDate || "your event"}. Looking forward to cooking for you and your ${queryGuests} guests!`,
                  time: "Just now",
                },
              ];
            });
          }
        }
        setError(null);
      }
    } catch (err) {
      console.warn("[status] Poll error:", err);
    } finally {
      setLoading(false);
    }
  }, [ref, name, queryDate, queryGuests]);

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(interval);
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 5000);
    return () => clearInterval(pollInterval);
  }, [fetchStatus]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage.trim();
    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: msg, time: "Just now" },
    ]);
    setNewMessage("");

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "concierge",
          text: "Thanks! Our concierge team has noted this and notified your chef.",
          time: "Just now",
        },
      ]);
    }, 1500);
  };

  const waText = encodeURIComponent(
    `Hi Book A Chef! I'm tracking my chef request #${ref} (${name}). Could you provide an update on my dispatch?`
  );

  const currentStageData = STAGES[currentStage - 1];

  return (
    <div className="min-h-screen bg-forest-950 text-cream-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-900/80 border border-champagne-400/30 text-xs font-bold text-champagne-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Chef Dispatch Tracker</span>
            <span className="text-forest-400">•</span>
            <span className="font-mono text-champagne-300 font-bold">#{ref.slice(0, 8).toUpperCase()}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-black text-white tracking-tight">
            {currentStage === 1 && "Request Logged"}
            {currentStage === 2 && "Finding Your Chef…"}
            {currentStage === 3 && "Chef Matched!"}
            {currentStage === 4 && "Chef Is En Route"}
            {currentStage === 5 && "Chef Cooking in Your Kitchen"}
          </h1>

          <p className="text-sm text-forest-200/90 max-w-lg mx-auto">
            {currentStage < 3
              ? `Hello ${name}, our concierge is reviewing our network of certified chefs for your event in ${queryLocation}.`
              : `Great news! ${chef?.name || "A chef"} has been assigned to your event. Details and direct messaging are active below.`}
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-champagne-400 animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-900/30 border border-red-800 rounded-2xl p-6 text-center mb-8">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={fetchStatus} className="mt-3 text-champagne-400 text-sm font-bold hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Stepper */}
        {!loading && !error && (
          <>
            <div className="bg-forest-900/60 border border-forest-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {STAGES.map((s) => {
                  const isPast = currentStage > s.step;
                  const isCurrent = currentStage === s.step;
                  const Icon = s.icon;

                  return (
                    <div
                      key={s.id}
                      className={`flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300 ${
                        isCurrent
                          ? "bg-forest-800/80 border border-champagne-400/50 shadow-lg scale-105"
                          : isPast
                          ? "opacity-90"
                          : "opacity-40"
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all ${
                          isCurrent
                            ? "bg-champagne-400 text-forest-950 shadow-md ring-4 ring-champagne-400/20"
                            : isPast
                            ? "bg-emerald-500 text-forest-950"
                            : "bg-forest-800 text-forest-400"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-champagne-400">
                        Step {s.step}
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 line-clamp-1">{s.title}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-5 border-t border-forest-800/80 flex items-center justify-between text-xs text-forest-300">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-champagne-400" />
                  <span>Current Status:</span>
                  <strong className="text-white">{currentStageData?.title}</strong>
                </span>
                <span className="text-forest-400 hidden sm:inline">
                  Estimated Concierge SLA: <strong>&lt; 30 Minutes</strong>
                </span>
              </div>
            </div>

            {/* Chef assigned card */}
            {currentStage >= 3 && chef ? (
              <div className="bg-gradient-to-br from-forest-900 to-forest-950 border border-champagne-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 space-y-6">
                <div className="flex items-center justify-between border-b border-forest-800 pb-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-champagne-400">
                    <ChefHat className="h-4 w-4" />
                    <span>Your Assigned Private Chef</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    Confirmed & Ready
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-champagne-400/60 shadow-xl shrink-0">
                    <Image
                      src={chef.avatar_url}
                      alt={chef.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                        {chef.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-champagne-400/20 text-champagne-300 text-[10px] font-black">
                        <ShieldCheck className="h-3 w-3" /> Certified Master
                      </span>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-bold pt-1">
                      <span className="flex items-center gap-1 text-champagne-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{chef.rating.toFixed(1)}</span>
                      </span>
                      <span className="text-forest-400">•</span>
                      <span className="text-forest-200">
                        {chef.cuisines.join(", ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-black text-xs uppercase tracking-wider transition-all shadow-md"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{showChat ? "Hide Chat" : "Chat with Chef"}</span>
                      </button>

                      <a
                        href={`https://wa.me/254786530713?text=${encodeURIComponent(
                          `Hi Chef! I'm ${name}, client for booking #${ref} on ${queryDate}. Looking forward to our dinner!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href="tel:+254786530713"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-800 hover:bg-forest-700 text-forest-200 font-bold text-xs border border-forest-700 transition-all"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call Concierge</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Chat drawer */}
                {showChat && (
                  <div className="mt-6 pt-6 border-t border-forest-800 space-y-4">
                    <div className="bg-forest-950/70 border border-forest-800 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-3">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${
                            msg.sender === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <span className="text-[10px] text-forest-400 uppercase font-black tracking-wider mb-1">
                            {msg.sender === "user"
                              ? "You"
                              : msg.sender === "chef"
                              ? chef.name
                              : "Book A Chef Concierge"}
                          </span>
                          <div
                            className={`p-3 rounded-2xl max-w-sm text-xs leading-relaxed ${
                              msg.sender === "user"
                                ? "bg-champagne-400 text-forest-950 font-medium rounded-tr-none"
                                : "bg-forest-800 text-cream-100 rounded-tl-none border border-forest-700"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[9px] text-forest-500 mt-0.5">{msg.time}</span>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message to your assigned chef..."
                        className="flex-1 bg-forest-900 border border-forest-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-forest-500 focus:outline-none focus:border-champagne-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-champagne-400 hover:bg-champagne-300 text-forest-950 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              /* Radar searching card */
              <div className="bg-forest-900/40 border border-forest-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 mb-8 relative overflow-hidden">
                <div className="relative mx-auto w-24 h-24">
                  <div
                    className={`absolute inset-0 rounded-full bg-champagne-400/20 transition-all duration-1000 ${
                      pulse ? "scale-150 opacity-100" : "scale-100 opacity-40"
                    }`}
                  />
                  <div
                    className={`absolute inset-0 rounded-full bg-champagne-400/10 transition-all duration-700 ${
                      pulse ? "scale-125 opacity-80" : "scale-100 opacity-20"
                    }`}
                  />
                  <div className="relative w-24 h-24 rounded-full bg-forest-900 border-2 border-champagne-400/60 flex items-center justify-center shadow-2xl">
                    <ChefHat className="h-10 w-10 text-champagne-400" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="font-serif text-2xl font-bold text-white">
                    Contacting Available Chefs in {queryLocation}…
                  </h3>
                  <p className="text-xs text-forest-300 leading-relaxed">
                    We are checking chef availability and menu qualifications for your {queryGuests}-guest event. You will receive an immediate SMS/WhatsApp confirmation once matched.
                  </p>
                </div>
              </div>
            )}

            {/* Event specs */}
            <div className="bg-forest-900/40 border border-forest-800 rounded-3xl p-6 sm:p-8 space-y-4 mb-8">
              <h3 className="font-serif text-lg font-bold text-white border-b border-forest-800 pb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-champagne-400" />
                <span>Event Specifications</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-forest-950/50 p-3.5 rounded-2xl border border-forest-800/60">
                  <span className="text-forest-400 block text-[10px] uppercase font-black">Date</span>
                  <strong className="text-white mt-1 block truncate">
                    {queryDate || "Selected on Booking"}
                  </strong>
                </div>
                <div className="bg-forest-950/50 p-3.5 rounded-2xl border border-forest-800/60">
                  <span className="text-forest-400 block text-[10px] uppercase font-black">Guests</span>
                  <strong className="text-white mt-1 block">
                    {queryGuests} Guests
                  </strong>
                </div>
                <div className="bg-forest-950/50 p-3.5 rounded-2xl border border-forest-800/60">
                  <span className="text-forest-400 block text-[10px] uppercase font-black">Cuisine</span>
                  <strong className="text-champagne-300 mt-1 block truncate">
                    {queryCuisine}
                  </strong>
                </div>
                <div className="bg-forest-950/50 p-3.5 rounded-2xl border border-forest-800/60">
                  <span className="text-forest-400 block text-[10px] uppercase font-black">Location</span>
                  <strong className="text-white mt-1 block truncate">
                    {queryLocation}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bottom links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs border-t border-forest-800/80 pt-6">
              <p className="text-forest-400 text-center sm:text-left">
                Need urgent changes? WhatsApp Concierge at{" "}
                <a
                  href={`https://wa.me/254786530713?text=${waText}`}
                  className="text-champagne-400 font-bold hover:underline"
                >
                  +254 786 530 713
                </a>
              </p>

              <div className="flex items-center gap-4">
                <Link
                  href="/request"
                  className="text-forest-300 hover:text-white font-bold transition-colors"
                >
                  + New Request
                </Link>
                <span className="text-forest-700">•</span>
                <Link
                  href="/"
                  className="text-champagne-400 hover:text-champagne-300 font-bold transition-colors"
                >
                  Return Home
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-forest-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-champagne-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}
