"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChefHat,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  Users,
  Utensils,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Phone,
  Clock,
  Home,
  Truck,
  Receipt,
  Building2,
  Send,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);

  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pType, setPType] = useState("Private Dinner / Birthday");
  const [pDate, setPDate] = useState("");
  const [pLocation, setPLocation] = useState("");
  const [pGuests, setPGuests] = useState("12");
  const [pBudget, setPBudget] = useState("4500");
  const [pCuisine, setPCuisine] = useState("");
  const [pNotes, setPNotes] = useState("");

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalSubmitting(true);
    try {
      const res = await fetch("/api/proposals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName,
          email: pEmail,
          phone: pPhone,
          event_type: pType,
          event_date: pDate,
          location: pLocation,
          guest_count: Number(pGuests),
          budget_per_guest: Number(pBudget),
          cuisine_preference: pCuisine,
          additional_details: pNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProposalSuccess(true);
      } else {
        alert(data.error || "Could not submit proposal. Please try again.");
      }
    } catch (e: any) {
      alert("Network error: " + e.message);
    } finally {
      setProposalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-32 pb-20 overflow-hidden bg-forest-950">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070"
            alt="Private dining setup"
            fill
            priority
            className="object-cover opacity-30 filter brightness(75)"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/70 to-forest-950" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-900/90 border border-forest-700/60 text-xs font-bold text-champagne-300 backdrop-blur-md shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-champagne-400" />
            <span>On-Demand Private Chef Dispatch • Nairobi & Coast</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.15]">
            Book a Certified Private Chef <br className="hidden sm:inline" />
            <span className="text-champagne-400 italic">to Your Home.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-cream-200/90 font-medium leading-relaxed">
            Just like Uber or Gwiji for culinary masters: Tell us your date, location, and preferred cuisine. Book A Chef matches and dispatches a verified, meal-tested chef straight to your kitchen.
          </p>

          {/* Primary Dispatch Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/request"
              className="px-8 py-4 rounded-full bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-champagne-400/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <ChefHat className="h-5 w-5" />
              <span>Request a Chef Now →</span>
            </Link>
            <Link
              href="/request/status"
              className="px-6 py-4 rounded-full bg-forest-900/90 hover:bg-forest-800 text-cream-100 font-bold text-xs uppercase tracking-wider border border-forest-700 transition-all backdrop-blur-md"
            >
              Track Live Booking
            </Link>
          </div>

          {/* 3-Step Uber / Gwiji Explainer Bar */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto text-left">
            <div className="bg-forest-900/80 border border-forest-800/80 p-4 rounded-2xl backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-champagne-400 tracking-wider">1. Make a Request</span>
              <p className="text-xs font-bold text-white mt-1">Tell Us Your Event</p>
              <p className="text-[11px] text-cream-200/70 mt-0.5">Date, guest count, cuisine preference, and home address.</p>
            </div>
            <div className="bg-forest-900/80 border border-forest-800/80 p-4 rounded-2xl backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-champagne-400 tracking-wider">2. We Match & Dispatch</span>
              <p className="text-xs font-bold text-white mt-1">Concierge Assignment</p>
              <p className="text-[11px] text-cream-200/70 mt-0.5">We pair you with a vetted, background-checked chef.</p>
            </div>
            <div className="bg-forest-900/80 border border-forest-800/80 p-4 rounded-2xl backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-champagne-400 tracking-wider">3. Live Tracking & Feast</span>
              <p className="text-xs font-bold text-white mt-1">Chef Cooks at Home</p>
              <p className="text-[11px] text-cream-200/70 mt-0.5">Track arrival live, chat in-app, and enjoy the dining experience.</p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-cream-200/80 text-xs font-bold">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-champagne-400" />
              <span>In-Home Dining or Fresh Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-champagne-400" />
              <span>Flexible Sourcing (Chef or Host Provided)</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-champagne-400" />
              <span>Meal-Tested & Approved Before Entry</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PERSONALIZE YOUR MENU */}
      <section className="bg-cream-100/70 py-20 border-t border-forest-100/80 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-champagne-700 px-3 py-1 bg-champagne-100/90 rounded-full border border-champagne-300/60 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Tailored Gastronomy
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950">
              Personalize Your Menu
            </h2>
            <p className="text-sm text-forest-600">
              Every celebration has its own rhythm. Collaborate with your chef to design a custom multi-course journey.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-center">
              <div className="md:col-span-3 hidden md:block">
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-xl border-4 border-white hover:scale-[1.02] transition-transform duration-500">
                  <Image
                    src="/images/home/gourmet-skewers.jpg"
                    alt="Artisanal skewers and fresh grain salad"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-forest-950/70 backdrop-blur-md px-2.5 py-1 rounded-full">
                    Artisanal Nyama & Skewers
                  </span>
                </div>
              </div>

              <div className="md:col-span-6 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative aspect-square sm:aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border-4 border-white hover:scale-[1.02] transition-transform duration-500">
                    <Image
                      src="/images/home/chef-plating.jpg"
                      alt="Chef delicately plating fine dining course"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-forest-950/70 backdrop-blur-md px-2.5 py-1 rounded-full">
                      Master Plating
                    </span>
                  </div>

                  <div className="relative aspect-square sm:aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border-4 border-white hover:scale-[1.02] transition-transform duration-500">
                    <Image
                      src="/images/home/saffron-risotto.jpg"
                      alt="Saffron risotto with seafood"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-forest-950/70 backdrop-blur-md px-2.5 py-1 rounded-full">
                      Saffron & Coastal Seafood
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-champagne-300 via-champagne-400 to-amber-300 text-forest-950 rounded-[32px] p-6 sm:p-8 text-center shadow-xl border border-champagne-400 space-y-4">
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                    Personalize your menu
                  </h3>
                  <p className="text-xs sm:text-sm text-forest-900 leading-relaxed max-w-lg mx-auto font-medium">
                    A romantic dinner, a family gathering, or a celebration with friends; traditional dishes we all know and love, or exotic world flavors. We cater to vegetarian, halal, gluten-free, and allergy-sensitive guests. Every experience is unique!
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/request"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-forest-950 font-black text-xs uppercase tracking-widest shadow-md hover:bg-forest-900 hover:text-white transition-all transform hover:-translate-y-0.5"
                    >
                      <span>Start Your Request</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 hidden md:block">
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-xl border-4 border-white hover:scale-[1.02] transition-transform duration-500">
                  <Image
                    src="/images/home/tropical-harvest.jpg"
                    alt="Fresh sliced figs, passion fruit, and pomegranates"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-forest-950/70 backdrop-blur-md px-2.5 py-1 rounded-full">
                    Seasonal Harvest
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE CULINARY PARTNERSHIP */}
      <section className="bg-forest-950 text-cream-50 py-20 border-y border-forest-900 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-champagne-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto mb-14 bg-gradient-to-r from-champagne-500/15 via-forest-900/60 to-champagne-500/15 border border-champagne-400/30 rounded-3xl p-6 sm:p-8 text-center relative backdrop-blur-md shadow-2xl">
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-forest-900/80 border border-champagne-400/20 text-[10px] font-black uppercase tracking-[0.2em] text-champagne-400">
              <Sparkles className="h-3 w-3" />
              <span>Our Culinary Partnership</span>
            </div>
            <p className="font-serif text-lg sm:text-2xl text-cream-50 font-medium italic leading-relaxed">
              &ldquo;The artistry of Kenya's finest restaurants and master chefs, brought directly to your table. Personal service, signature menus, and ingredients you trust.&rdquo;
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 text-xs font-bold text-champagne-300">
              <span className="h-px w-8 bg-champagne-400/30" />
              <span>Restaurant-Affiliated Chefs • Independent Masters • In-Home Dining & Fresh Delivery</span>
              <span className="h-px w-8 bg-champagne-400/30" />
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-champagne-400 bg-forest-900/80 px-3.5 py-1.5 rounded-full border border-champagne-500/20">
              <Building2 className="h-3.5 w-3.5" />
              From Premier Kitchens to Private Homes
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Where Top Restaurants & <br className="hidden sm:inline" />
              <span className="text-champagne-400 italic">Private Dining Meet</span>
            </h2>
            <p className="text-sm sm:text-base text-cream-200/80 leading-relaxed font-medium">
              We collaborate with celebrated restaurants, executive chefs, and independent culinary artisans. Diners enjoy signature menus with 100% undivided attention, while restaurants unlock high-yield private dining and villa experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* LEFT: FOR DINERS */}
            <div className="bg-forest-900/40 border border-champagne-500/30 rounded-[32px] p-8 sm:p-10 space-y-6 flex flex-col justify-between shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-champagne-400">
                    For Diners & Hosts
                  </span>
                  <span className="text-xs text-champagne-300 font-bold px-2.5 py-1 rounded-full bg-forest-900/90 border border-champagne-400/30">
                    The Private Table
                  </span>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Signature Restaurant & Master Menus</span>
                      <span className="text-cream-200/70 text-xs">Dine on signature courses from celebrated restaurant executive chefs and vetted independent culinary masters.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">In-Home Cooking or Fresh Delivery</span>
                      <span className="text-cream-200/70 text-xs">Watch courses prepared live in your kitchen with full spotless cleanup, or receive fresh hot delivery in presentation platters.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Flexible Ingredient Sourcing</span>
                      <span className="text-cream-200/70 text-xs">Choose whether your chef sources fresh ingredients with itemized receipts at 0% markup, or use ingredients you provide at home.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">100% Undivided Culinary Attention</span>
                      <span className="text-cream-200/70 text-xs">Your chef focuses solely on your table, accommodating custom dietary preferences and pacing dinner to your rhythm.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">97% Vetted Chef Profiles & Trust</span>
                      <span className="text-cream-200/70 text-xs">Every active culinary partner must achieve at least 97% profile completeness, government ID vetting, and tasted menus before going live.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-cream-200/70">Looking for an unforgettable meal?</span>
                <Link
                  href="/request"
                  className="px-5 py-2.5 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Request a Chef →
                </Link>
              </div>
            </div>

            {/* RIGHT: FOR RESTAURANTS */}
            <div className="bg-gradient-to-br from-forest-900/90 to-forest-950 border border-emerald-400/40 rounded-[32px] p-8 sm:p-10 space-y-6 flex flex-col justify-between shadow-2xl relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-emerald-400/20">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    For Restaurants & Kitchens
                  </span>
                  <span className="text-xs text-emerald-300 font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/30">
                    Partner With Us
                  </span>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Complete Chef Privacy: Fresh Delivery Only</span>
                      <span className="text-cream-200/70 text-xs">Turn off in-home visits anytime. Fulfill high-yield private dining orders as "Cooked & Delivered" tasting feasts dispatched hot from your commercial kitchen without sending staff off-site.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Expand Beyond Dining Room Capacity</span>
                      <span className="text-cream-200/70 text-xs">List your executive chefs and sous chefs for high-margin private dining, intimate home dinners, and corporate villa bookings.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Showcase Your Restaurant Brand</span>
                      <span className="text-cream-200/70 text-xs">Feature your restaurant's brand profile, signature tasting menus, and culinary accolades to premier clientele across Kenya.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Guaranteed M-Pesa Escrow Payouts</span>
                      <span className="text-cream-200/70 text-xs">100% upfront culinary fee escrow, direct supermarket Till payments for ingredients at cost, and automated settlements after each successful event.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Full Schedule & Menu Autonomy</span>
                      <span className="text-cream-200/70 text-xs">Control availability around your restaurant's peak hours. Accept bookings only when your chefs are available.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-cream-200/70">Own a restaurant or culinary group?</span>
                <Link
                  href="/apply?type=restaurant"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-forest-950 text-xs font-black uppercase tracking-wider transition-all"
                >
                  List Your Chefs →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="bg-white border-y border-forest-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest-600 px-3 py-1 bg-forest-50 rounded-full">
              Dining Process
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950">
              How In-Home Dining Works
            </h2>
            <p className="text-sm text-forest-600">
              From request to clean kitchen counters, here is what happens when you book.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            {[
              {
                step: "01",
                title: "Submit Your Request",
                desc: "Tell us your date, location, cuisine preference, guest count, and budget. No chef selection needed.",
                icon: <ChefHat className="h-5 w-5 text-forest-800" />,
              },
              {
                step: "02",
                title: "We Match & Dispatch",
                desc: "Our system finds the best available chef matching your criteria and assigns them to your event.",
                icon: <ShieldCheck className="h-5 w-5 text-forest-800" />,
              },
              {
                step: "03",
                title: "Chef Accepts & Prepares",
                desc: "Your assigned chef reviews the request, confirms availability, and plans the menu.",
                icon: <Utensils className="h-5 w-5 text-forest-800" />,
              },
              {
                step: "04",
                title: "Cooking & Cleanup",
                desc: "Your chef arrives with fresh ingredients, preps, cooks course-by-course, and leaves your kitchen spotless.",
                icon: <Sparkles className="h-5 w-5 text-forest-800" />,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-cream-50/80 rounded-3xl p-6 border border-forest-100 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-white text-forest-900 flex items-center justify-center shadow-sm border border-forest-100">
                    {item.icon}
                  </div>
                  <span className="font-serif text-xl font-bold text-champagne-600">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-serif text-base font-bold text-forest-950">
                  {item.title}
                </h3>
                <p className="text-xs text-forest-600 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4.5 ABOUT US */}
      <section className="bg-cream-50 py-20 border-b border-forest-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest-600 px-3 py-1 bg-forest-100 rounded-full">
              Our Story & Mission
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-forest-950">
              About Us
            </h2>
            <p className="text-sm sm:text-base text-forest-700 leading-relaxed font-medium max-w-2xl mx-auto">
              Book A Chef was born with the conviction that the talent of Kenya's finest culinary masters should not remain hidden behind the thick walls of restaurant kitchens; it should shine where people enjoy the most unforgettable dinners — at their own table.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-champagne-300 via-champagne-400 to-amber-300 p-6 sm:p-7 rounded-3xl shadow-sm text-center flex flex-col justify-center border border-champagne-400">
                <span className="text-3xl mb-2">🍳</span>
                <span className="font-serif text-base font-extrabold text-forest-950 block leading-snug">
                  Live Kitchen Tasting
                </span>
                <span className="text-[11px] font-medium text-forest-800 mt-1.5 leading-snug">
                  Every chef cooks a full multi-course menu at our private Nairobi test kitchen. Our panel tastes, scores, and approves before listing.
                </span>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm text-center flex flex-col justify-center border border-forest-100">
                <span className="text-3xl mb-2">🛡️</span>
                <span className="font-serif text-base font-extrabold text-champagne-600 block leading-snug">
                  Food Safety & HACCP
                </span>
                <span className="text-[11px] font-medium text-forest-700 mt-1.5 leading-snug">
                  Updated County Food Handler certificates required. HACCP-certified chefs earn a verified badge for medical-grade kitchen safety.
                </span>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm text-center flex flex-col justify-center border border-forest-100">
                <span className="text-3xl mb-2">📜</span>
                <span className="font-serif text-base font-extrabold text-champagne-600 block leading-snug">
                  Background & Safety Compliance
                </span>
                <span className="text-[11px] font-medium text-forest-700 mt-1.5 leading-snug">
                  Verified government identity + current background clearance certificate on file before any chef enters your home.
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
                <Image
                  src="/images/home/chef-celebration.jpg"
                  alt="Private chef serving happy guests at an outdoor villa terrace"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/70 via-forest-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest text-champagne-300 mb-1">
                    Unforgettable Dining
                  </span>
                  <p className="font-serif text-lg sm:text-xl font-bold leading-snug">
                    &ldquo;Exceptional food, zero kitchen stress, and restaurant-quality service at our Karen home.&rdquo;
                  </p>
                  <p className="text-xs text-cream-200/80 mt-1">
                    — Verified Host, Nairobi Private Dinner
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.6 TRUSTED SOURCING */}
      <section className="bg-white py-20 border-b border-forest-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest-600 px-3.5 py-1 bg-forest-100 rounded-full inline-flex items-center gap-1.5">
              <Receipt className="h-3 w-3 text-forest-700" />
              0% Grocery Markup • Sourced by Chef or Host
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-forest-950">
              Reliable Sourcing from Kenya's Top Markets & Grocers
            </h2>
            <p className="text-sm sm:text-base text-forest-600 leading-relaxed font-medium max-w-2xl mx-auto">
              Enjoy total flexibility: let your private chef handpick prime fresh ingredients with store receipts at zero markup, or source ingredients yourself according to your chef's custom checklist.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-10">
            <div className="bg-cream-50/70 rounded-3xl p-6 border border-forest-100 hover:border-forest-300 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between text-center group">
              <div className="relative w-full h-16 rounded-2xl overflow-hidden bg-white p-2 border border-forest-100/60 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Image src="/images/supermarkets/carrefour.png" alt="Carrefour Kenya Supermarket" fill className="object-contain p-2" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-forest-950 text-sm">Carrefour</h4>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">Fresh Daily Sourcing</span>
                <p className="text-[11px] text-forest-500 pt-1 leading-snug">Organic greens, imported delicacies & ocean catches.</p>
              </div>
            </div>

            <div className="bg-cream-50/70 rounded-3xl p-6 border border-forest-100 hover:border-forest-300 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between text-center group">
              <div className="relative w-full h-16 rounded-2xl overflow-hidden bg-[#1b3a32] p-2 border border-forest-900/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Image src="/images/supermarkets/chandarana.png" alt="Chandarana Foodplus Supermarket" fill className="object-contain p-1.5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-forest-950 text-sm">Chandarana Foodplus</h4>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Gourmet & Delicatessen</span>
                <p className="text-[11px] text-forest-500 pt-1 leading-snug">Artisanal cheeses, prime meats & Asian pantry spices.</p>
              </div>
            </div>

            <div className="bg-cream-50/70 rounded-3xl p-6 border border-forest-100 hover:border-forest-300 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between text-center group">
              <div className="relative w-full h-16 rounded-2xl overflow-hidden bg-[#f37a20] p-2 border border-amber-600/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Image src="/images/supermarkets/naivas.png" alt="Naivas Supermarket" fill className="object-contain p-2" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-forest-950 text-sm">Naivas</h4>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">Highland Fresh Harvest</span>
                <p className="text-[11px] text-forest-500 pt-1 leading-snug">Aged beef cuts, fresh poultry & farm-direct veggies.</p>
              </div>
            </div>

            <div className="bg-cream-50/70 rounded-3xl p-6 border border-forest-100 hover:border-forest-300 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between text-center group">
              <div className="relative w-full h-16 rounded-2xl overflow-hidden bg-[#ee2e38] p-2 border border-red-600/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Image src="/images/supermarkets/quickmart.png" alt="Quickmart Supermarket" fill className="object-contain p-2" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-forest-950 text-sm">Quickmart</h4>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-red-800 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">Fresh & Easy Bakery</span>
                <p className="text-[11px] text-forest-500 pt-1 leading-snug">Neighborhood quick-pick produce, deli cuts & pantry goods.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.7 DESTINATIONS */}
      <section className="bg-cream-50/50 py-16 border-b border-forest-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
              Private Chefs in Kenya
            </h2>
            <p className="text-xs sm:text-sm text-forest-600">
              Discover cities, coastal enclaves, and suburbs where you can enjoy our private culinary experiences.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center max-w-4xl mx-auto text-xs">
            <div className="space-y-3">
              {["Westlands", "Kilimani", "Lavington", "Kileleshwa", "Riverside", "Parklands"].map((loc) => (
                <div key={loc} className="space-y-0.5">
                  <span className="text-[10px] text-forest-400 block font-medium">Chef in</span>
                  <Link href={`/request?location=${encodeURIComponent(loc)}`} className="font-bold text-forest-950 hover:text-champagne-600 transition-colors block text-sm">
                    {loc}
                  </Link>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {["Karen", "Runda", "Muthaiga", "Spring Valley", "Kitisuru", "Nyari"].map((loc) => (
                <div key={loc} className="space-y-0.5">
                  <span className="text-[10px] text-forest-400 block font-medium">Chef in</span>
                  <Link href={`/request?location=${encodeURIComponent(loc)}`} className="font-bold text-forest-950 hover:text-champagne-600 transition-colors block text-sm">
                    {loc}
                  </Link>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {["Diani Beach", "Watamu", "Nyali Mombasa", "Kilifi Creek", "Lamu Island", "Malindi"].map((loc) => (
                <div key={loc} className="space-y-0.5">
                  <span className="text-[10px] text-forest-400 block font-medium">Chef in</span>
                  <Link href={`/request?location=${encodeURIComponent(loc)}`} className="font-bold text-forest-950 hover:text-champagne-600 transition-colors block text-sm">
                    {loc}
                  </Link>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {["Naivasha", "Tigoni", "Nanyuki", "Eldoret", "Nakuru"].map((loc) => (
                <div key={loc} className="space-y-0.5">
                  <span className="text-[10px] text-forest-400 block font-medium">Chef in</span>
                  <Link href={`/request?location=${encodeURIComponent(loc)}`} className="font-bold text-forest-950 hover:text-champagne-600 transition-colors block text-sm">
                    {loc}
                  </Link>
                </div>
              ))}
              <div className="space-y-0.5">
                <span className="text-[10px] text-forest-400 block font-medium">Chef in</span>
                <Link href="/request" className="font-bold text-champagne-600 hover:text-champagne-500 transition-colors block text-sm">
                  All Destinations →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.8 TYPES OF SERVICE */}
      <section className="bg-white py-16 border-b border-forest-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
              Types of Service
            </h2>
            <p className="text-xs sm:text-sm text-forest-600">
              Explore bespoke dining formats and culinary celebrations available across Kenya.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center max-w-4xl mx-auto text-xs">
            <div className="space-y-4">
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Romantic Dinner</span>
                <span className="text-[11px] text-forest-500">Private Chef</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Anniversary Feast</span>
                <span className="text-[11px] text-forest-500">In-Home Dining</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Proposal Dinners</span>
                <span className="text-[11px] text-forest-500">Bespoke Course Menu</span>
              </Link>
            </div>

            <div className="space-y-4">
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Coastal Villa Chef</span>
                <span className="text-[11px] text-forest-500">Diani & Watamu Retreats</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Holiday Home Chef</span>
                <span className="text-[11px] text-forest-500">Villas & Cottages</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Safari Camp Dining</span>
                <span className="text-[11px] text-forest-500">Bush & Country Banquets</span>
              </Link>
            </div>

            <div className="space-y-4">
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">New Year's Eve Dinner</span>
                <span className="text-[11px] text-forest-500">Holiday Celebration</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Nyama Choma & BBQ</span>
                <span className="text-[11px] text-forest-500">Garden Grilling</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Swahili & Coastal Banquet</span>
                <span className="text-[11px] text-forest-500">Fresh Seafood Feast</span>
              </Link>
            </div>

            <div className="space-y-4">
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Cooked & Delivered</span>
                <span className="text-[11px] text-forest-500">Restaurant Kitchens</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Corporate Boardroom</span>
                <span className="text-[11px] text-forest-500">Executive Lunches</span>
              </Link>
              <Link href="/request" className="block group">
                <span className="font-bold text-forest-950 group-hover:text-champagne-600 transition-colors block text-sm">Private Tasting Studio</span>
                <span className="text-[11px] text-forest-500">Degustation & Wine</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. REQUEST A BESPOKE PROPOSAL BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-[36px] bg-forest-900 text-cream-50 p-8 sm:p-12 lg:p-14 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-champagne-400">
              Bespoke Catering & Large Events
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Planning a Wedding, Corporate Banquet, or Large Villa Dinner?
            </h2>
            <p className="text-xs sm:text-sm text-forest-200 leading-relaxed max-w-2xl">
              For gatherings over 15 guests or custom tasting menus, submit your event details. Our culinary team will assemble a tailored menu proposal and chef team for your event.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              onClick={() => {
                setProposalSuccess(false);
                setProposalModalOpen(true);
              }}
              className="w-full py-4 px-6 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-black text-xs uppercase tracking-widest text-center transition-all shadow-lg"
            >
              Request Custom Proposal →
            </button>
            <Link
              href="/apply"
              className="w-full py-3.5 px-6 rounded-2xl bg-forest-800 hover:bg-forest-700 text-white font-bold text-xs uppercase tracking-wider text-center border border-forest-700 transition-all"
            >
              Apply as a Private Chef
            </Link>
          </div>
        </div>
      </section>

      {/* 5.5 FINAL CTA BANNER */}
      <section className="bg-gradient-to-br from-forest-900 via-forest-950 to-forest-900 text-cream-50 py-20 relative overflow-hidden border-t border-forest-800">
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-champagne-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-800/80 border border-champagne-400/30 text-[10px] font-black uppercase tracking-[0.2em] text-champagne-300 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Private Dining Reimagined</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Ready to Turn Your Dining Room <br />
            Into Kenya's Finest Restaurant?
          </h2>
          <p className="text-sm sm:text-base text-cream-200/80 max-w-2xl mx-auto leading-relaxed font-medium">
            Bespoke private dining managed from start to finish. Certified chef talent, personalized multi-course menus, and flexible ingredient sourcing with zero markup.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/request"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-black text-xs uppercase tracking-widest shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              Request a Chef Now →
            </Link>
            <Link
              href="/apply"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-forest-800/80 hover:bg-forest-800 text-cream-100 font-bold text-xs uppercase tracking-wider border border-forest-700 transition-all"
            >
              Apply as a Chef
            </Link>
          </div>
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-cream-300/70 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-champagne-400" />
              <span>100% Upfront Escrow Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-champagne-400" />
              <span>Direct Store Till Payment (Zero Markup)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-champagne-400" />
              <span>97%+ Vetted Chef Roster</span>
            </div>
          </div>
        </div>
      </section>

      {/* Request a Proposal Modal */}
      {proposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="relative bg-white rounded-[32px] max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5 border border-forest-100 text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-champagne-700">
                  Concierge Catering
                </span>
                <h3 className="font-serif text-2xl font-bold text-forest-950">
                  Request a Custom Proposal
                </h3>
              </div>
              <button
                onClick={() => setProposalModalOpen(false)}
                className="h-8 w-8 rounded-full bg-forest-50 text-forest-800 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {proposalSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="font-serif text-lg font-bold text-forest-950">Concierge Inquiry Received</h4>
                <p className="text-xs text-forest-600 leading-relaxed">
                  Thank you! Our concierge team has received your request and will reach out shortly with a customized chef match and bespoke menu options.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <a
                    href="https://wa.me/254786530713?text=Hi%20Book%20A%20Chef%20Concierge,%20I%20just%20submitted%20a%20private%20dining%20request%20on%20the%20website"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <span>Chat on WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setProposalModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-forest-900 text-white text-xs font-bold hover:bg-forest-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProposalSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Your Name *</label>
                    <input type="text" required placeholder="Full Name" value={pName} onChange={(e) => setPName(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Phone Number *</label>
                    <input type="tel" required placeholder="0712 345 678" value={pPhone} onChange={(e) => setPPhone(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Email Address *</label>
                    <input type="email" required placeholder="you@example.com" value={pEmail} onChange={(e) => setPEmail(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Event Type</label>
                    <select value={pType} onChange={(e) => setPType(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-bold outline-none">
                      <option value="Private Dinner / Birthday">Private Dinner / Birthday</option>
                      <option value="Wedding / Engagement">Wedding / Engagement</option>
                      <option value="Corporate Event / Banquet">Corporate Event / Banquet</option>
                      <option value="Villa Holiday Catering">Villa Holiday Catering (Multi-Day)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Event Date *</label>
                    <input type="date" required value={pDate} onChange={(e) => setPDate(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Guest Count *</label>
                    <input type="number" required min={1} value={pGuests} onChange={(e) => setPGuests(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-forest-950">Budget / Guest (KES)</label>
                    <input type="number" value={pBudget} onChange={(e) => setPBudget(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Location / Venue *</label>
                  <input type="text" required placeholder="e.g. Karen, Nairobi / Diani Beachfront Villa" value={pLocation} onChange={(e) => setPLocation(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Cuisine Preferences & Notes</label>
                  <textarea rows={3} placeholder="Preferred dishes, dietary requirements, beverage pairing requirements..." value={pNotes} onChange={(e) => setPNotes(e.target.value)} className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium outline-none resize-none" />
                </div>

                <button
                  type="submit"
                  disabled={proposalSubmitting}
                  className="w-full py-3.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                >
                  {proposalSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Event Proposal Request →"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
