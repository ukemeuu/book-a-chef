"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChefHat,
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Home,
  Truck,
  Receipt,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CUISINE_CATEGORIES = [
  { id: "all", label: "All", icon: "✨" },
  { id: "Swahili", label: "Swahili & Seafood", icon: "🦐" },
  { id: "BBQ", label: "Nyama Choma & BBQ", icon: "🔥" },
  { id: "Italian", label: "Italian & Pasta", icon: "🍝" },
  { id: "Fine Dining", label: "Fine Dining", icon: "🍷" },
  { id: "Continental", label: "Continental", icon: "🥩" },
  { id: "Indian", label: "Indian & Fusion", icon: "🍛" },
  { id: "Pastry", label: "Pastry & Desserts", icon: "🥐" },
  { id: "Vegan", label: "Plant-Based", icon: "🥗" },
];

const DINING_EXPERIENCES = [
  {
    name: "Romantic Dinner",
    label: "Private Chef",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Nyama Choma & BBQ",
    label: "Garden Grilling",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Swahili Seafood",
    label: "Coastal Feast",
    image:
      "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Corporate Lunch",
    label: "Executive Dining",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Birthday Party",
    label: "Celebration",
    image:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Cooked & Delivered",
    label: "Drop-off",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Wine & Tasting",
    label: "Degustation",
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Vegan Feast",
    label: "Plant-Based",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tell Us Your Event",
    desc: "Date, location, cuisine, guests, budget. That's it — no browsing, no decisions.",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    step: "02",
    title: "We Match & Dispatch",
    desc: "Our system finds the best available chef for your criteria and assigns them instantly.",
    icon: <ChefHat className="h-5 w-5" />,
  },
  {
    step: "03",
    title: "Chef Arrives & Cooks",
    desc: "Your chef shows up with fresh ingredients, cooks course-by-course, and cleans up.",
    icon: <Sparkles className="h-5 w-5" />,
  },
];

const TRUST_FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5 text-forest-600" />,
    title: "Vetted & Verified",
    desc: "Every chef passes background checks, kitchen tastings, and ID verification.",
  },
  {
    icon: <Receipt className="h-5 w-5 text-forest-600" />,
    title: "0% Markup Sourcing",
    desc: "Your chef shops at Carrefour, Naivas, or Chandarana — receipts at cost.",
  },
  {
    icon: <Star className="h-5 w-5 text-forest-600" />,
    title: "Meal-Tested",
    desc: "Every chef cooks a full menu at our test kitchen before going live.",
  },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(4);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-white text-forest-950 font-sans">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative bg-forest-950 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070"
            alt="Private dining"
            fill
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/60 via-forest-950/80 to-forest-950" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
            A private chef,
            <br />
            <span className="text-champagne-400">at your table.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-cream-200/80 max-w-xl mx-auto leading-relaxed">
            Tell us what you need. We dispatch a certified chef to your kitchen.
          </p>

          {/* Search Bar — Airbnb style */}
          <div className="mt-8 bg-white rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-50 transition-colors cursor-pointer">
              <MapPin className="h-5 w-5 text-forest-400 shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400">Where</p>
                <input
                  type="text"
                  placeholder="Nairobi, Diani, Naivasha..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-sm font-medium text-forest-950 placeholder-forest-400 outline-none bg-transparent"
                />
              </div>
            </div>
            <div className="hidden sm:block w-px bg-forest-100" />
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-50 transition-colors cursor-pointer">
              <Calendar className="h-5 w-5 text-forest-400 shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400">When</p>
                <input
                  type="date"
                  min={minDateStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm font-medium text-forest-950 placeholder-forest-400 outline-none bg-transparent"
                />
              </div>
            </div>
            <div className="hidden sm:block w-px bg-forest-100" />
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-50 transition-colors cursor-pointer">
              <Users className="h-5 w-5 text-forest-400 shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400">Guests</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGuests(Math.max(2, guests - 1))}
                    className="w-6 h-6 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:border-forest-400 transition-colors"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium text-forest-950 w-6 text-center">{guests}</span>
                  <button
                    onClick={() => setGuests(Math.min(80, guests + 1))}
                    className="w-6 h-6 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:border-forest-400 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <Link
              href="/request"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-champagne-500 hover:bg-champagne-600 text-white font-bold text-sm transition-all active:scale-95 shrink-0"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Link>
          </div>

          {/* Quick stats */}
          <div className="mt-8 flex items-center justify-center gap-6 text-cream-200/60 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-champagne-400" />
              50+ certified chefs
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-champagne-400 fill-current" />
              4.9 average rating
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-champagne-400" />
              Background checked
            </span>
          </div>
        </div>
      </section>

      {/* ── CATEGORY PILLS ── */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-forest-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Scrolls horizontally on mobile, wraps and centres from md up so
              pills never break flex alignment on short desktop viewports. */}
          <div
            className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar
                       md:flex-wrap md:justify-center md:overflow-visible"
            role="tablist"
            aria-label="Cuisine categories"
          >
            {CUISINE_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex shrink-0 items-center justify-center gap-2
                              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                              transition-colors duration-200 focus-visible:ring-2
                              focus-visible:ring-forest-950 focus-visible:ring-offset-2
                              focus-visible:outline-none ${
                                isActive
                                  ? "bg-forest-950 text-white shadow-sm"
                                  : "bg-cream-100 text-forest-700 hover:bg-cream-200"
                              }`}
                >
                  <span aria-hidden="true" className="leading-none">
                    {cat.icon}
                  </span>
                  <span className="leading-none">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              How it works
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              Three steps to dinner
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="group flex flex-col h-full bg-cream-50 rounded-2xl p-6 border border-forest-100/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-forest-700 shadow-sm border border-forest-100">
                    {item.icon}
                  </div>
                  <span className="font-serif text-2xl font-bold leading-none text-champagne-500/40">
                    {item.step}
                  </span>
                </div>
                {/* mt-auto pins the text block to the card floor so titles and
                    copy align across cards regardless of copy length. */}
                <h3 className="font-serif text-lg font-bold leading-snug text-forest-950 mb-1.5 mt-auto">
                  {item.title}
                </h3>
                <p className="text-sm text-forest-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST FEATURES ── */}
      <section className="py-16 sm:py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              Why Book A Chef
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              Built on trust
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {TRUST_FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-forest-100">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-forest-950 mb-1">{feature.title}</h3>
                  <p className="text-sm text-forest-600 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICE TYPES ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                Experiences
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                Ways to dine
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DINING_EXPERIENCES.map((item) => (
              <Link
                key={item.name}
                href="/request"
                className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-forest-100/60 bg-white hover:shadow-lg hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-forest-950 focus-visible:ring-offset-2 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-100 shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-forest-950/45 via-transparent to-transparent"
                    aria-hidden="true"
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm text-forest-950 group-hover:text-champagne-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-forest-500 mt-0.5">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      {/* Generous bottom padding keeps clear separation from the dark CTA
          block below it on every breakpoint. */}
      <section className="pt-16 pb-24 sm:pt-20 sm:pb-28 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              Where we operate
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              Chefs across Kenya
            </h2>
          </div>

          {/* items-stretch + h-full keep every card the same height so the
              grid never collapses or spills into the CTA below. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-stretch">
            {[
              { name: "Westlands", area: "Nairobi" },
              { name: "Karen", area: "Nairobi" },
              { name: "Diani Beach", area: "Coast" },
              { name: "Kilimani", area: "Nairobi" },
              { name: "Runda", area: "Nairobi" },
              { name: "Watamu", area: "Coast" },
              { name: "Naivasha", area: "Rift Valley" },
              { name: "Nyali", area: "Mombasa" },
            ].map((loc) => (
              <Link
                key={loc.name}
                href={`/request?location=${encodeURIComponent(loc.name)}`}
                className="group flex items-center gap-3 h-full p-4 rounded-xl bg-white border border-forest-100/60 hover:shadow-md hover:border-forest-200 focus-visible:ring-2 focus-visible:ring-forest-950 focus-visible:ring-offset-2 transition-all"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg bg-cream-100 flex items-center justify-center text-forest-600 group-hover:bg-champagne-100 group-hover:text-champagne-600 transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-forest-950 truncate">
                    {loc.name}
                  </p>
                  <p className="text-xs text-forest-500">{loc.area}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-forest-950 px-6 py-16 sm:px-12 sm:py-20 text-center">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-champagne-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="relative max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Your kitchen is the best restaurant in town
              </h2>
              <p className="mt-4 text-cream-200/70 text-base sm:text-lg leading-relaxed">
                Let a certified chef prove it. Request in 30 seconds, get matched in minutes.
              </p>
              <div className="mt-8">
                <Link
                  href="/request"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-champagne-500 hover:bg-champagne-600 text-white font-bold text-sm uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  <ChefHat className="h-5 w-5" />
                  <span>Request a Chef</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
