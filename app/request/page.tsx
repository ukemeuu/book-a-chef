"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import {
  MapPin, Calendar, Users, ChefHat, ArrowRight, Clock,
  Home, Truck, Phone, Mail, Loader2, Check,
} from "lucide-react";

const CUISINE_OPTIONS = [
  { id: "Swahili", label: "Swahili & Seafood", icon: "🦐" },
  { id: "BBQ", label: "Nyama Choma & BBQ", icon: "🔥" },
  { id: "Fine Dining", label: "Fine Dining", icon: "🍷" },
  { id: "Italian", label: "Italian & Pasta", icon: "🍝" },
  { id: "Continental", label: "Continental", icon: "🥩" },
  { id: "Indian", label: "Indian & Fusion", icon: "🍛" },
  { id: "Pastry", label: "Pastry & Desserts", icon: "🥐" },
  { id: "Vegan", label: "Plant-Based", icon: "🥗" },
  { id: "Any", label: "Surprise Me!", icon: "✨" },
];

const TIME_SLOTS = [
  "12:30 (Lunch)", "14:00 (Afternoon Feast)", "18:30 (Early Dinner)",
  "19:00 (Dinner)", "19:30 (Dinner)", "20:00 (Late Dinner)",
];

const LOCATIONS = [
  "Nairobi – Westlands", "Nairobi – Karen", "Nairobi – Runda",
  "Nairobi – Kilimani", "Nairobi – Lavington", "Nairobi – Kileleshwa",
  "Nairobi – Muthaiga", "Nairobi – Spring Valley", "Nairobi – Riverside",
  "Coast – Diani Beach", "Coast – Watamu", "Coast – Nyali Mombasa",
  "Coast – Kilifi", "Coast – Lamu Island",
  "Rift Valley – Naivasha", "Rift Valley – Tigoni",
  "Other Location in Kenya",
];

const BUDGET_OPTIONS = ["3500", "5000", "7500", "10000", "15000"];

function RequestChefContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const qLocation = searchParams.get("location");
  const qCuisine = searchParams.get("cuisine");
  const qDate = searchParams.get("date");
  const qGuests = searchParams.get("guests");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authChecked, setAuthChecked] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.toString() ? `/request?${params.toString()}` : "/request";
        window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
      } else {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  const [date, setDate] = useState(qDate || "");
  const [time, setTime] = useState("19:00 (Dinner)");
  const [guests, setGuests] = useState(qGuests ? parseInt(qGuests) : 4);
  const [location, setLocation] = useState(
    qLocation
      ? LOCATIONS.find((l) => l.toLowerCase().includes(qLocation.toLowerCase())) || qLocation
      : ""
  );
  const [serviceFormat, setServiceFormat] = useState("in_home");
  const [cuisine, setCuisine] = useState(
    qCuisine
      ? CUISINE_OPTIONS.find(
          (c) =>
            c.label.toLowerCase().includes(qCuisine.toLowerCase()) ||
            c.id.toLowerCase().includes(qCuisine.toLowerCase())
        )?.id || qCuisine
      : ""
  );
  const [sourcing, setSourcing] = useState("chef_sourced");
  const [dietary, setDietary] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [budget, setBudget] = useState("5000");
  const [customBudget, setCustomBudget] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  const minDateStr = minDate.toISOString().split("T")[0];

  const effectiveBudget = budget === "" ? customBudget : budget;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = "Required";
    if (!location) newErrors.location = "Required";
    if (!cuisine) newErrors.cuisine = "Required";
    if (!name.trim()) newErrors.name = "Required";
    if (!phone.trim()) newErrors.phone = "Required";
    if (!effectiveBudget || parseInt(effectiveBudget) <= 0) newErrors.budget = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      const firstError = document.querySelector("[data-error]");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const ref = "BAC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const payload = {
        reference: ref,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        booking_date: date,
        booking_time: time,
        guests_count: guests,
        location_address: location,
        cuisine_preference: cuisine,
        service_format: serviceFormat,
        sourcing_preference: sourcing,
        dietary_notes: dietary,
        special_requests: specialRequests,
        budget_per_person: parseInt(effectiveBudget) || 5000,
        status: "pending_assignment",
      };
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(
          `/request/status?ref=${ref}&name=${encodeURIComponent(name)}&cuisine=${encodeURIComponent(cuisine)}&guests=${guests}&date=${encodeURIComponent(date)}&location=${encodeURIComponent(location)}`
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setErrors({ submit: data.error || "Something went wrong. Please try again." });
        setSubmitting(false);
      }
    } catch {
      setErrors({ submit: "Network error. Please check your connection and try again." });
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";
  const labelClass = "block text-sm font-medium text-forest-950 mb-2";
  const errorClass = "text-red-500 text-xs mt-1";

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            Request a chef
          </h1>
          <p className="mt-2 text-forest-500">
            Tell us what you need. We&apos;ll handle the rest.
          </p>
        </div>

        <div className="space-y-6">
          {/* Event Details */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6 space-y-5">
            <h2 className="text-lg font-bold text-forest-950">Event details</h2>

            {/* Dining Style */}
            <div>
              <label className={labelClass}>Dining style</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setServiceFormat("in_home")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    serviceFormat === "in_home"
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <Home className={`h-5 w-5 ${serviceFormat === "in_home" ? "text-champagne-400" : "text-forest-500"}`} />
                  <div>
                    <span className={`block text-sm font-bold ${serviceFormat === "in_home" ? "text-white" : "text-forest-950"}`}>
                      Chef cooks at home
                    </span>
                    <span className={`text-xs ${serviceFormat === "in_home" ? "text-cream-200" : "text-forest-500"}`}>
                      In-home dining
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFormat("delivery")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    serviceFormat === "delivery"
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <Truck className={`h-5 w-5 ${serviceFormat === "delivery" ? "text-champagne-400" : "text-forest-500"}`} />
                  <div>
                    <span className={`block text-sm font-bold ${serviceFormat === "delivery" ? "text-white" : "text-forest-950"}`}>
                      Cooked & delivered
                    </span>
                    <span className={`text-xs ${serviceFormat === "delivery" ? "text-cream-200" : "text-forest-500"}`}>
                      Drop-off
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div data-error={errors.date || undefined}>
                <label className={labelClass}>Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                  <input
                    type="date"
                    min={minDateStr}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass + " pl-10"}
                  />
                </div>
                {errors.date && <p className={errorClass}>{errors.date}</p>}
              </div>
              <div>
                <label className={labelClass}>Time</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={inputClass + " pl-10 appearance-none"}
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div data-error={errors.location || undefined}>
              <label className={labelClass}>Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass + " pl-10 appearance-none"}
                >
                  <option value="">Select location</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {errors.location && <p className={errorClass}>{errors.location}</p>}
            </div>

            {/* Guests */}
            <div>
              <label className={labelClass}>Guests</label>
              <div className="flex items-center justify-between bg-white border border-forest-200 rounded-xl px-4 py-3">
                <button
                  type="button"
                  onClick={() => setGuests(Math.max(2, guests - 1))}
                  className="w-8 h-8 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:border-forest-400 transition-colors"
                >
                  −
                </button>
                <span className="text-lg font-bold text-forest-950">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests(Math.min(80, guests + 1))}
                  className="w-8 h-8 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:border-forest-400 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </section>

          {/* Cuisine & Budget */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6 space-y-5">
            <h2 className="text-lg font-bold text-forest-950">Cuisine & budget</h2>

            {/* Cuisine */}
            <div data-error={errors.cuisine || undefined}>
              <label className={labelClass}>Cuisine</label>
              <div className="grid grid-cols-3 gap-2">
                {CUISINE_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCuisine(c.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      cuisine === c.id
                        ? "border-forest-950 bg-forest-950 text-white"
                        : "border-forest-200 hover:border-forest-400"
                    }`}
                  >
                    <span className="text-xl block mb-1">{c.icon}</span>
                    <span className={`text-xs font-medium ${cuisine === c.id ? "text-cream-200" : "text-forest-700"}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.cuisine && <p className={errorClass}>{errors.cuisine}</p>}
            </div>

            {/* Sourcing */}
            <div>
              <label className={labelClass}>Ingredient sourcing</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSourcing("chef_sourced")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    sourcing === "chef_sourced"
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <span className={`block text-sm font-bold ${sourcing === "chef_sourced" ? "text-white" : "text-forest-950"}`}>
                    Chef shops
                  </span>
                  <span className={`text-xs ${sourcing === "chef_sourced" ? "text-cream-200" : "text-forest-500"}`}>
                    0% markup, receipts at cost
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourcing("client_sourced")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    sourcing === "client_sourced"
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <span className={`block text-sm font-bold ${sourcing === "client_sourced" ? "text-white" : "text-forest-950"}`}>
                    I&apos;ll provide
                  </span>
                  <span className={`text-xs ${sourcing === "client_sourced" ? "text-cream-200" : "text-forest-500"}`}>
                    You supply ingredients
                  </span>
                </button>
              </div>
            </div>

            {/* Budget */}
            <div data-error={errors.budget || undefined}>
              <label className={labelClass}>Budget per person (KES)</label>
              <div className="grid grid-cols-3 gap-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => { setBudget(b); setCustomBudget(""); }}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      budget === b
                        ? "border-forest-950 bg-forest-950 text-white"
                        : "border-forest-200 hover:border-forest-400 text-forest-700"
                    }`}
                  >
                    {parseInt(b).toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBudget("")}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    budget === ""
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400 text-forest-700"
                  }`}
                >
                  Custom
                </button>
              </div>
              {budget === "" && (
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(e.target.value)}
                  className={inputClass + " mt-2"}
                />
              )}
              {errors.budget && <p className={errorClass}>{errors.budget}</p>}
            </div>

            {/* Dietary */}
            <div>
              <label className={labelClass}>Dietary requirements</label>
              <input
                type="text"
                placeholder="e.g. Halal, Vegan, Nut allergy…"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Special Requests */}
            <div>
              <label className={labelClass}>Special requests</label>
              <textarea
                rows={2}
                placeholder="Themed dinner, live cooking station, décor…"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className={inputClass + " resize-none"}
              />
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6 space-y-5">
            <h2 className="text-lg font-bold text-forest-950">Your details</h2>

            <div data-error={errors.name || undefined}>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div data-error={errors.phone || undefined}>
              <label className={labelClass}>WhatsApp number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                <input
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass + " pl-10"}
                />
              </div>
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            <div>
              <label className={labelClass}>Email (optional)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass + " pl-10"}
                />
              </div>
            </div>
          </section>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {errors.submit}
            </div>
          )}

          {/* Submit */}
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-4 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Request a Chef
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-xs text-forest-400 text-center">
            By requesting a chef you agree to our{" "}
            <a href="/terms" className="underline hover:text-forest-950">Terms of Service</a>.
            {" "}We&apos;ll reach out via WhatsApp to confirm your match.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RequestChefPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
        </div>
      }
    >
      <RequestChefContent />
    </Suspense>
  );
}
