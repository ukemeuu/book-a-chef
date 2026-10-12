"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import {
  MapPin, Calendar, Users, ChefHat, ArrowRight, Clock,
  Home, Truck, Phone, Mail, Loader2, Check, ShieldCheck,
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

/**
 * Occasion is the strongest commercial signal on this form. "Anniversary for
 * 6" and "corporate team dinner for 20" need entirely different chefs, and a
 * stated occasion says something about willingness to pay.
 *
 * The reference funnel this multi-select pattern was borrowed from asks about
 * nutrition instead — the wrong question for a one-off private dining event.
 */
const OCCASION_OPTIONS = [
  { id: "Birthday", label: "Birthday", icon: "🎂" },
  { id: "Anniversary", label: "Anniversary", icon: "💐" },
  { id: "Date Night", label: "Date Night", icon: "🕯️" },
  { id: "Family Gathering", label: "Family Gathering", icon: "👨‍👩‍👧‍👦" },
  { id: "Corporate", label: "Corporate / Team", icon: "💼" },
  { id: "Wedding", label: "Wedding / Reception", icon: "💒" },
  { id: "Religious", label: "Religious Occasion", icon: "🙏" },
  { id: "Surprise", label: "Surprise", icon: "🎁" },
  { id: "Other", label: "Something Else", icon: "✨" },
];

/**
 * Structured dietary requirements.
 *
 * Previously a free-text box. "no nuts" typed into a text field gives a chef
 * nothing to match on and cannot be filtered. These are discrete values so
 * they can be compared against chef.dietary_specialties during matching. The
 * free-text box is retained for anything not covered here.
 */
const DIETARY_OPTIONS = [
  { id: "Halal", label: "Halal", icon: "🕌" },
  { id: "Vegetarian", label: "Vegetarian", icon: "🥗" },
  { id: "Vegan", label: "Vegan", icon: "🌱" },
  { id: "Gluten-Free", label: "Gluten-Free", icon: "🌾" },
  { id: "Dairy-Free", label: "Dairy-Free", icon: "🥛" },
  { id: "Nut Allergy", label: "Nut Allergy", icon: "🥜" },
  { id: "Pescatarian", label: "Pescatarian", icon: "🐟" },
  { id: "Low Carb / Keto", label: "Low Carb / Keto", icon: "🥑" },
];

/**
 * Reassurance shown with the request form.
 *
 * Every claim here must be independently true on the day it renders. These
 * replace the reference site's rotating proof points after discarding their
 * numbers — that site advertises "14,000 chefs" and "53,000 meals cooked",
 * while we have one chef and one booking. Publishing their figures would be the
 * same fabricated proof that makes a marketplace untrustworthy.
 */
const REASSURANCE_POINTS = [
  "You choose Accept or Decline before any chef is committed.",
  "Every chef is ID-verified and kitchen-tasted before going live.",
  "Payment is held until your chef accepts, then released via M-Pesa.",
];

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

  // Multi-select.
  //
  // This was single-select, which forced a guest who wanted both Italian and
  // seafood to pick one. That matters beyond the form: utils/dispatch.ts scores
  // cuisine match at 40 points — the largest weight in the model — so a single
  // value both narrowed the customer's intent and narrowed what the engine
  // could match on.
  //
  // `cuisine` (singular) is kept as the primary/first selection so existing
  // code and existing rows keep working. `cuisines` is the full set.
  const [cuisines, setCuisines] = useState<string[]>(() => {
    if (!qCuisine) return [];
    const match = CUISINE_OPTIONS.find(
      (c) =>
        c.label.toLowerCase().includes(qCuisine.toLowerCase()) ||
        c.id.toLowerCase().includes(qCuisine.toLowerCase())
    );
    return [match?.id || qCuisine];
  });

  const toggleCuisine = (id: string) =>
    setCuisines((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  // "Any" is mutually exclusive with specific choices.
  const selectCuisine = (id: string) => {
    if (id === "Any") {
      setCuisines(cuisines.includes("Any") ? [] : ["Any"]);
      return;
    }
    if (cuisines.includes("Any")) {
      setCuisines([id]);
      return;
    }
    toggleCuisine(id);
  };

  const cuisine = cuisines[0] || "";
  const [occasion, setOccasion] = useState<string[]>([]);
  const toggleOccasion = (id: string) =>
    setOccasion((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );

  const [sourcing, setSourcing] = useState("chef_sourced");
  const [dietary, setDietary] = useState<string[]>([]);
  const toggleDietary = (id: string) =>
    setDietary((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  const [dietaryOther, setDietaryOther] = useState("");
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
    if (cuisines.length === 0) newErrors.cuisine = "Pick at least one";
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
        // The API reads `cuisine_type`. This form previously sent
        // `cuisine_preference`, so the customer's cuisine was silently dropped
        // and the booking arrived with cuisine_type = null — which disabled the
        // single largest dispatch scoring term (40 points). Send both names so
        // the field survives either way.
        //
        // cuisine_type stays singular (primary choice) for backward
        // compatibility; cuisine_types carries the full multi-select set that
        // dispatch matches against.
        cuisine_type: cuisine,
        cuisine_preference: cuisine,
        cuisine_types: cuisines,
        occasion_types: occasion,
        dietary_requirements: [...dietary, ...(dietaryOther.trim() ? [dietaryOther.trim()] : [])],
        service_format: serviceFormat,
        sourcing_preference: sourcing,
        dietary_notes: dietaryOther.trim() || dietary.join(", ") || null,
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

            {/* Occasion — new */}
            <div>
              <label className={labelClass}>What is the occasion?</label>
              <div className="grid grid-cols-3 gap-2">
                {OCCASION_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={occasion.includes(o.id)}
                    onClick={() => toggleOccasion(o.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all relative ${
                      occasion.includes(o.id)
                        ? "border-forest-950 bg-forest-950 text-white"
                        : "border-forest-200 hover:border-forest-400"
                    }`}
                  >
                    {occasion.includes(o.id) && (
                      <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-champagne-400 flex items-center justify-center">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-forest-950" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6.5l2.5 2.5L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                    <span className="text-xl block mb-1">{o.icon}</span>
                    <span className={`text-xs font-medium ${occasion.includes(o.id) ? "text-cream-200" : "text-forest-700"}`}>
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-forest-400 mt-2">
                Optional, but it helps us match a chef suited to the evening.
              </p>
            </div>

            {/* Cuisine — multi-select */}
            <div data-error={errors.cuisine || undefined}>
              <label className={labelClass}>Cuisine</label>
              <div className="grid grid-cols-3 gap-2">
                {CUISINE_OPTIONS.map((c) => {
                  const active = cuisines.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectCuisine(c.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all relative ${
                        active
                          ? "border-forest-950 bg-forest-950 text-white"
                          : "border-forest-200 hover:border-forest-400"
                      }`}
                    >
                      {active && (
                        <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-champagne-400 flex items-center justify-center">
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-forest-950" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M2 6.5l2.5 2.5L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                      <span className="text-xl block mb-1">{c.icon}</span>
                      <span className={`text-xs font-medium ${active ? "text-cream-200" : "text-forest-700"}`}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-forest-400 mt-2">
                Choose as many as you like — more choices means a better match.
              </p>
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

            {/* Dietary — structured chips + free text */}
            <div>
              <label className={labelClass}>Dietary requirements</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DIETARY_OPTIONS.map((d) => {
                  const active = dietary.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleDietary(d.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all ${
                        active
                          ? "border-forest-950 bg-forest-950 text-white"
                          : "border-forest-200 hover:border-forest-400 text-forest-700"
                      }`}
                    >
                      <span>{d.icon}</span>
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Anything else? e.g. severe shellfish allergy"
                value={dietaryOther}
                onChange={(e) => setDietaryOther(e.target.value)}
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

          {/* Reassurance — rotating, and every claim must stay true */}
          <ul className="space-y-2 pt-2">
            {REASSURANCE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-xs text-forest-500">
                <ShieldCheck className="w-4 h-4 text-forest-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
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
