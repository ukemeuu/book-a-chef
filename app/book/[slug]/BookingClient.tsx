"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  MapPin,
  BadgeCheck,
  Calendar,
  Clock,
  Users,
  Home,
  Truck,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Phone,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  MarketplaceChef,
  ChefAvailability,
  BlockedDate,
  formatPrice,
  DAY_NAMES,
} from "@/utils/marketplace";
import { createClient } from "@/utils/supabase/client";

const TIME_SLOTS = [
  "12:30 (Lunch)",
  "14:00 (Afternoon Feast)",
  "18:30 (Early Dinner)",
  "19:00 (Dinner)",
  "19:30 (Dinner)",
  "20:00 (Late Dinner)",
];

const OCCASIONS = [
  { id: "Birthday", label: "Birthday", icon: "🎂" },
  { id: "Anniversary", label: "Anniversary", icon: "💐" },
  { id: "Date Night", label: "Date Night", icon: "🕯️" },
  { id: "Family Gathering", label: "Family Gathering", icon: "👨‍👩‍👧‍👦" },
  { id: "Corporate", label: "Corporate / Team", icon: "💼" },
  { id: "Wedding", label: "Wedding / Reception", icon: "💒" },
  { id: "Other", label: "Something Else", icon: "✨" },
];

interface BookingClientProps {
  chef: MarketplaceChef;
  availability: ChefAvailability | null;
  blockedDates: BlockedDate[];
  busyDates: string[];
}

export default function BookingClient({
  chef,
  availability,
  blockedDates,
  busyDates,
}: BookingClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    bookingId: string;
    reference: string;
  } | null>(null);

  // Form state.
  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    chef.menus?.[0]?.id || ""
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00 (Dinner)");
  const [guests, setGuests] = useState(Math.max(2, chef.min_guests || 2));
  const [serviceFormat, setServiceFormat] = useState<"in_home" | "delivery">(
    chef.allow_in_home ? "in_home" : "delivery"
  );
  const [location, setLocation] = useState(chef.city || "Nairobi");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [dietary, setDietary] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Compute disabled dates (blocked + busy + past + outside working days).
  const disabledDates = useMemo(() => {
    const disabled = new Set<string>();
    const blockedSet = new Set(blockedDates.map((b) => b.blocked_date));
    const busySet = new Set(busyDates);

    // Check the next 120 days.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 120; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];

      // Past dates.
      if (i === 0) {
        disabled.add(iso);
        continue;
      }

      // Blocked or busy.
      if (blockedSet.has(iso) || busySet.has(iso)) {
        disabled.add(iso);
        continue;
      }

      // Outside working days.
      if (availability?.working_days?.length) {
        const day = d.getDay();
        if (!availability.working_days.includes(day)) {
          disabled.add(iso);
        }
      }
    }

    return disabled;
  }, [blockedDates, busyDates, availability]);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 120);
    return d.toISOString().split("T")[0];
  }, []);

  // Check auth and prefill.
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/book/${chef.slug}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();

      setName((prev) => prev || profile?.full_name || user.user_metadata?.full_name || "");
      setPhone((prev) => prev || profile?.phone || "");
      setEmail((prev) => prev || profile?.email || user.email || "");
      setAuthChecked(true);
    }
    checkAuth();
  }, [chef.slug, router, supabase]);

  const selectedMenu = chef.menus?.find((m) => m.id === selectedMenuId);
  const pricePerGuest = selectedMenu?.price_per_guest || chef.price_per_guest;
  const totalPrice = pricePerGuest * guests;

  const toggleOccasion = (id: string) =>
    setOccasions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );

  const validate = (): boolean => {
    if (!selectedMenuId) {
      setError("Please select a menu.");
      return false;
    }
    if (!date) {
      setError("Please choose a date.");
      return false;
    }
    if (disabledDates.has(date)) {
      setError("That date is not available. Please pick another.");
      return false;
    }
    if (!name.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    if (!phone.trim()) {
      setError("Please enter your WhatsApp number.");
      return false;
    }
    if (guests < (chef.min_guests || 2)) {
      setError(`This chef requires at least ${chef.min_guests || 2} guests.`);
      return false;
    }
    if (guests > (chef.max_guests || 30)) {
      setError(`This chef can serve up to ${chef.max_guests || 30} guests.`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chef_id: chef.id,
          menu_id: selectedMenuId,
          client_name: name.trim(),
          client_phone: phone.trim(),
          client_email: email.trim(),
          booking_date: date,
          booking_time: time,
          guests_count: guests,
          location_address: location,
          location_city: chef.city,
          cuisine_type: chef.cuisines?.[0] || null,
          cuisine_types: chef.cuisines || [],
          occasion_types: occasions,
          dietary_requirements: dietary ? [dietary] : [],
          dietary_notes: dietary || null,
          special_requests: specialRequests,
          service_format: serviceFormat,
          sourcing_preference: "chef_sourced",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not create the booking. Please try again.");
        return;
      }

      setSuccess({
        bookingId: data.booking?.id,
        reference: data.reference,
      });

      // Scroll to top so the success state is visible.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  // Success state.
  if (success) {
    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-forest-100 p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-forest-950 mb-2">
              Booking request sent!
            </h1>
            <p className="text-sm text-forest-600 mb-6">
              {chef.name} has been notified and will confirm your request
              shortly. We&apos;ll send you a WhatsApp update as soon as they
              respond.
            </p>
            <div className="bg-cream-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-forest-500 mb-1">Booking reference</p>
              <p className="text-lg font-bold text-forest-950 font-mono">
                #{success.reference}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-950 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-forest-800 transition-colors"
              >
                Track my booking
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chefs"
                className="w-full py-3 rounded-xl border border-forest-200 text-forest-800 font-medium text-sm hover:bg-cream-50 transition-colors"
              >
                Browse more chefs
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";
  const labelClass = "block text-sm font-medium text-forest-950 mb-2";

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {/* Back link */}
        <Link
          href={`/chefs/${chef.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-600 hover:text-forest-950 transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {chef.name.split(" ")[0]}&apos;s profile
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-cream-100">
            <Image
              src={chef.avatar_url}
              alt={chef.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-forest-950 tracking-tight">
                Book {chef.name}
              </h1>
              {chef.verified && (
                <BadgeCheck className="h-5 w-5 text-forest-600" />
              )}
            </div>
            <p className="text-sm text-forest-500">
              {chef.cuisines?.slice(0, 3).join(" • ")} • {chef.city}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Menu selection */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              1. Choose a menu
            </h2>
            <div className="space-y-3">
              {chef.menus?.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => setSelectedMenuId(menu.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedMenuId === menu.id
                      ? "border-forest-950 bg-forest-50/50"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {menu.tag && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-champagne-100 text-champagne-800 text-[10px] font-bold uppercase tracking-wide mb-1">
                          {menu.tag}
                        </span>
                      )}
                      <p className="font-bold text-forest-950">{menu.title}</p>
                      {menu.description && (
                        <p className="text-xs text-forest-500 mt-0.5 line-clamp-2">
                          {menu.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-forest-950">
                        {formatPrice(menu.price_per_guest)}
                      </p>
                      <p className="text-[10px] text-forest-400">per guest</p>
                    </div>
                  </div>
                  {selectedMenuId === menu.id && (
                    <div className="mt-3 pt-3 border-t border-forest-100">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-950">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Selected
                      </span>
                    </div>
                  )}
                </button>
              ))}
              {(!chef.menus || chef.menus.length === 0) && (
                <p className="text-sm text-forest-500">
                  No menus available — the chef will create a custom menu for
                  your event.
                </p>
              )}
            </div>
          </section>

          {/* Date & time */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              2. Pick a date &amp; time
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass + " pl-10"}
                  />
                </div>
                {date && disabledDates.has(date) && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    This date is not available
                  </p>
                )}
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
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {availability && (
              <p className="text-xs text-forest-400 mt-3">
                {chef.name.split(" ")[0]} works{" "}
                {availability.working_days
                  ?.map((d) => DAY_NAMES[d])
                  .join(", ") || "flexible hours"}
                . Blocked and already-booked dates are disabled.
              </p>
            )}
          </section>

          {/* Guests & format */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              3. Guests &amp; format
            </h2>

            <div className="space-y-5">
              {/* Guests */}
              <div>
                <label className={labelClass}>
                  Guests ({chef.min_guests || 2}–{chef.max_guests || 30})
                </label>
                <div className="flex items-center justify-between bg-white border border-forest-200 rounded-xl px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setGuests(Math.max(chef.min_guests || 2, guests - 1))
                    }
                    className="w-8 h-8 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:border-forest-400 transition-colors"
                  >
                    −
                  </button>
                  <span className="text-lg font-bold text-forest-950">
                    {guests}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setGuests(Math.min(chef.max_guests || 30, guests + 1))
                    }
                    className="w-8 h-8 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:border-forest-400 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Service format */}
              {(chef.allow_in_home || chef.allow_delivery) && (
                <div>
                  <label className={labelClass}>Service format</label>
                  <div className="grid grid-cols-2 gap-3">
                    {chef.allow_in_home && (
                      <button
                        type="button"
                        onClick={() => setServiceFormat("in_home")}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          serviceFormat === "in_home"
                            ? "border-forest-950 bg-forest-950 text-white"
                            : "border-forest-200 hover:border-forest-400"
                        }`}
                      >
                        <Home
                          className={`h-5 w-5 ${
                            serviceFormat === "in_home"
                              ? "text-champagne-400"
                              : "text-forest-500"
                          }`}
                        />
                        <div>
                          <span
                            className={`block text-sm font-bold ${
                              serviceFormat === "in_home"
                                ? "text-white"
                                : "text-forest-950"
                            }`}
                          >
                            In-home
                          </span>
                          <span
                            className={`text-xs ${
                              serviceFormat === "in_home"
                                ? "text-cream-200"
                                : "text-forest-500"
                            }`}
                          >
                            Chef cooks at your place
                          </span>
                        </div>
                      </button>
                    )}
                    {chef.allow_delivery && (
                      <button
                        type="button"
                        onClick={() => setServiceFormat("delivery")}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          serviceFormat === "delivery"
                            ? "border-forest-950 bg-forest-950 text-white"
                            : "border-forest-200 hover:border-forest-400"
                        }`}
                      >
                        <Truck
                          className={`h-5 w-5 ${
                            serviceFormat === "delivery"
                              ? "text-champagne-400"
                              : "text-forest-500"
                          }`}
                        />
                        <div>
                          <span
                            className={`block text-sm font-bold ${
                              serviceFormat === "delivery"
                                ? "text-white"
                                : "text-forest-950"
                            }`}
                          >
                            Delivery
                          </span>
                          <span
                            className={`text-xs ${
                              serviceFormat === "delivery"
                                ? "text-cream-200"
                                : "text-forest-500"
                            }`}
                          >
                            Cooked &amp; delivered
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <label className={labelClass}>Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Westlands, Nairobi"
                    className={inputClass + " pl-10"}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Occasion & dietary */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              4. Occasion &amp; preferences
            </h2>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>Occasion (optional)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOccasion(o.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        occasions.includes(o.id)
                          ? "border-forest-950 bg-forest-950 text-white"
                          : "border-forest-200 hover:border-forest-400"
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{o.icon}</span>
                      <span
                        className={`text-xs font-medium ${
                          occasions.includes(o.id)
                            ? "text-cream-200"
                            : "text-forest-700"
                        }`}
                      >
                        {o.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Dietary requirements (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Halal, vegan, nut allergy…"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Special requests (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Themed dinner, live cooking station, décor…"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className={inputClass + " resize-none"}
                />
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-2xl border border-forest-100 p-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              5. Your details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Full name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
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
              </div>
              <div>
                <label className={labelClass}>Email (optional)</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Price summary */}
          <section className="bg-forest-950 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-bold mb-4">Price summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-cream-200/70">
                  {selectedMenu?.title || "Custom menu"} × {guests} guest
                  {guests === 1 ? "" : "s"}
                </span>
                <span className="font-medium">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cream-200/70">Platform fee</span>
                <span className="font-medium text-emerald-400">Included</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-forest-800">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
            <p className="text-xs text-cream-200/50 mt-3">
              Groceries are not included. Your chef shops at a store near you
              and shares the Till receipt for direct payment.
            </p>
          </section>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send booking request
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-xs text-forest-400 text-center">
            By booking you agree to our{" "}
            <Link href="/terms" className="underline hover:text-forest-950">
              Terms of Service
            </Link>
            . The chef will confirm before any payment is taken.
          </p>

          {/* Reassurance */}
          <ul className="space-y-2 pt-2">
            {[
              "The chef confirms before any payment is taken.",
              "Payment is held in escrow until you confirm with the chef.",
              "Full refund if the chef declines.",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-xs text-forest-500"
              >
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
