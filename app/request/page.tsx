"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  MapPin, Calendar, Users, Utensils, ChefHat, ArrowRight, Clock,
  Home, Truck, Sparkles, Phone, Mail, ShoppingBag, CheckCircle2, Loader2,
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

  const [date, setDate] = useState(qDate || "");
  const [time, setTime] = useState("19:00 (Dinner)");
  const [guests, setGuests] = useState(qGuests ? parseInt(qGuests) : 4);
  const [location, setLocation] = useState(
    qLocation
      ? LOCATIONS.find((l) => l.toLowerCase().includes(qLocation.toLowerCase())) || qLocation
      : "Nairobi – Westlands"
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
    if (!date) newErrors.date = "Please select a date";
    if (!location) newErrors.location = "Please select a location";
    if (!cuisine) newErrors.cuisine = "Please select a cuisine";
    if (!name.trim()) newErrors.name = "Please enter your name";
    if (!phone.trim()) newErrors.phone = "Please enter your WhatsApp number";
    if (!effectiveBudget || parseInt(effectiveBudget) <= 0) newErrors.budget = "Please enter a budget";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      // Scroll to first error
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
    "w-full bg-forest-900 border-2 border-forest-700 rounded-2xl px-4 py-3.5 text-sm font-medium text-white placeholder-forest-500 focus:border-champagne-400 focus:outline-none transition-colors";
  const labelClass = "block text-xs font-black uppercase tracking-wider text-forest-400 mb-2";
  const errorClass = "text-red-400 text-xs mt-1";

  return (
    <div className="min-h-screen bg-forest-950 text-white font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center px-4 pt-24 pb-20">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-400/10 border border-champagne-400/20 text-xs font-bold text-champagne-300 mb-4">
              <Sparkles className="h-3 w-3" /> On-Demand Chef Dispatch
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-white mb-2">
              Request a Private Chef
            </h1>
            <p className="text-sm text-forest-300">
              Tell us what you need — we'll match you with the perfect chef.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Event Details */}
            <div className="bg-forest-900/50 border border-forest-800 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-champagne-300">Event Details</p>

              {/* Dining Style */}
              <div>
                <label className={labelClass}>Dining Style</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setServiceFormat("in_home")} className={"p-3 rounded-xl border-2 text-left transition-all " + (serviceFormat === "in_home" ? "border-champagne-400 bg-champagne-400/10" : "border-forest-700 bg-forest-900")}>
                    <Home className={"h-4 w-4 mb-1 " + (serviceFormat === "in_home" ? "text-champagne-400" : "text-forest-400")} />
                    <span className="text-xs font-bold block text-forest-200">Chef Cooks at Your Home</span>
                  </button>
                  <button type="button" onClick={() => setServiceFormat("delivery")} className={"p-3 rounded-xl border-2 text-left transition-all " + (serviceFormat === "delivery" ? "border-champagne-400 bg-champagne-400/10" : "border-forest-700 bg-forest-900")}>
                    <Truck className={"h-4 w-4 mb-1 " + (serviceFormat === "delivery" ? "text-champagne-400" : "text-forest-400")} />
                    <span className="text-xs font-bold block text-forest-200">Fresh Prepared Delivery</span>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div data-error={errors.date || undefined}>
                <label className={labelClass}><Calendar className="h-3 w-3 inline mr-1.5" />Event Date *</label>
                <input type="date" min={minDateStr} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                {errors.date && <p className={errorClass}>{errors.date}</p>}
              </div>

              {/* Time */}
              <div>
                <label className={labelClass}><Clock className="h-3 w-3 inline mr-1.5" />Start Time</label>
                <select value={time} onChange={(e) => setTime(e.target.value)} className={inputClass}>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Location */}
              <div data-error={errors.location || undefined}>
                <label className={labelClass}><MapPin className="h-3 w-3 inline mr-1.5" />Location *</label>
                <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {errors.location && <p className={errorClass}>{errors.location}</p>}
              </div>

              {/* Guests */}
              <div>
                <label className={labelClass}><Users className="h-3 w-3 inline mr-1.5" />Number of Guests</label>
                <div className="flex items-center gap-4 bg-forest-900 border-2 border-forest-700 rounded-2xl px-4 py-3">
                  <button type="button" onClick={() => setGuests(Math.max(2, guests - 1))} className="w-8 h-8 rounded-full bg-forest-800 text-white font-black text-lg flex items-center justify-center hover:bg-forest-700">−</button>
                  <span className="flex-1 text-center text-2xl font-black text-white">{guests}</span>
                  <button type="button" onClick={() => setGuests(Math.min(80, guests + 1))} className="w-8 h-8 rounded-full bg-champagne-400 text-forest-950 font-black text-lg flex items-center justify-center hover:bg-champagne-300">+</button>
                </div>
                <p className="text-xs text-forest-500 mt-1 text-center">Minimum 2 guests</p>
              </div>
            </div>

            {/* Cuisine & Preferences */}
            <div className="bg-forest-900/50 border border-forest-800 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-champagne-300">Cuisine & Preferences</p>

              {/* Cuisine */}
              <div data-error={errors.cuisine || undefined}>
                <label className={labelClass}>Cuisine Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CUISINE_OPTIONS.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCuisine(c.id)} className={"p-3 rounded-xl border-2 text-center transition-all " + (cuisine === c.id ? "border-champagne-400 bg-champagne-400/10" : "border-forest-700 bg-forest-900")}>
                      <span className="text-xl block mb-1">{c.icon}</span>
                      <span className="text-xs font-bold leading-tight text-forest-200">{c.label}</span>
                    </button>
                  ))}
                </div>
                {errors.cuisine && <p className={errorClass}>{errors.cuisine}</p>}
              </div>

              {/* Sourcing */}
              <div>
                <label className={labelClass}>Ingredient Sourcing</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setSourcing("chef_sourced")} className={"p-3 rounded-xl border-2 text-left transition-all " + (sourcing === "chef_sourced" ? "border-champagne-400 bg-champagne-400/10" : "border-forest-700 bg-forest-900")}>
                    <ChefHat className={"h-4 w-4 mb-1 " + (sourcing === "chef_sourced" ? "text-champagne-400" : "text-forest-400")} />
                    <span className="text-xs font-bold block text-forest-200">Chef shops (0% markup)</span>
                  </button>
                  <button type="button" onClick={() => setSourcing("client_sourced")} className={"p-3 rounded-xl border-2 text-left transition-all " + (sourcing === "client_sourced" ? "border-champagne-400 bg-champagne-400/10" : "border-forest-700 bg-forest-900")}>
                    <ShoppingBag className={"h-4 w-4 mb-1 " + (sourcing === "client_sourced" ? "text-champagne-400" : "text-forest-400")} />
                    <span className="text-xs font-bold block text-forest-200">{"I'll provide ingredients"}</span>
                  </button>
                </div>
              </div>

              {/* Budget */}
              <div data-error={errors.budget || undefined}>
                <label className={labelClass}>Budget per Person (KES) *</label>
                <div className="grid grid-cols-3 gap-2">
                  {BUDGET_OPTIONS.map((b) => (
                    <button key={b} type="button" onClick={() => { setBudget(b); setCustomBudget(""); }} className={"py-2.5 rounded-xl border text-xs font-bold transition-all " + (budget === b ? "border-champagne-400 bg-champagne-400/10 text-champagne-300" : "border-forest-700 bg-forest-900 text-forest-300")}>
                      KES {parseInt(b).toLocaleString()}
                    </button>
                  ))}
                  <button type="button" onClick={() => setBudget("")} className={"py-2.5 rounded-xl border text-xs font-bold transition-all " + (budget === "" ? "border-champagne-400 bg-champagne-400/10 text-champagne-300" : "border-forest-700 bg-forest-900 text-forest-300")}>
                    Custom
                  </button>
                </div>
                {budget === "" && (
                  <input type="number" placeholder="Enter budget per person…" value={customBudget} onChange={(e) => setCustomBudget(e.target.value)} className={inputClass + " mt-2"} />
                )}
                {errors.budget && <p className={errorClass}>{errors.budget}</p>}
              </div>

              {/* Dietary */}
              <div>
                <label className={labelClass}>Dietary Requirements</label>
                <input type="text" placeholder="e.g. Halal, Vegan, Nut allergy…" value={dietary} onChange={(e) => setDietary(e.target.value)} className={inputClass} />
              </div>

              {/* Special Requests */}
              <div>
                <label className={labelClass}>Special Requests</label>
                <textarea rows={2} placeholder="Themed dinner, live cooking station, décor, etc." value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className={inputClass + " resize-none"} />
              </div>
            </div>

            {/* Contact */}
            <div className="bg-forest-900/50 border border-forest-800 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-champagne-300">Your Details</p>

              <div data-error={errors.name || undefined}>
                <label className={labelClass}>Full Name *</label>
                <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                {errors.name && <p className={errorClass}>{errors.name}</p>}
              </div>

              <div data-error={errors.phone || undefined}>
                <label className={labelClass}><Phone className="h-3 w-3 inline mr-1" />WhatsApp Number *</label>
                <input type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
              </div>

              <div>
                <label className={labelClass}><Mail className="h-3 w-3 inline mr-1" />Email Address</label>
                <input type="email" placeholder="you@email.com (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-900/30 border border-red-800 rounded-2xl p-4 text-sm text-red-300 text-center">
                {errors.submit}
              </div>
            )}

            {/* Submit */}
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className={"w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 " +
                (submitting
                  ? "bg-forest-800 text-forest-500 cursor-not-allowed"
                  : "bg-champagne-400 text-forest-950 hover:bg-champagne-300 shadow-lg shadow-champagne-400/20")
              }
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                : <><ChefHat className="h-4 w-4" /> Request a Chef <ArrowRight className="h-4 w-4" /></>
              }
            </button>

            <p className="text-xs text-forest-500 text-center leading-relaxed">
              By requesting a chef you agree to our <a href="/terms" className="text-champagne-400 underline">Terms of Service</a>. We will reach out via WhatsApp to confirm your chef match.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RequestChefPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-forest-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-champagne-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RequestChefContent />
    </Suspense>
  );
}
