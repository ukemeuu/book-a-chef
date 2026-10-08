"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChefHat,
  ShieldCheck,
  DollarSign,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ArrowRight,
  Utensils,
  Calendar,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ChefJobsPage() {
  const [dinnersPerWeek, setDinnersPerWeek] = useState(3);
  const [avgGuests, setAvgGuests] = useState(6);
  const [avgPricePerGuest, setAvgPricePerGuest] = useState(4500);

  // Income calculations (honest 85% chef payout after 15% platform fee)
  const grossWeekly = dinnersPerWeek * avgGuests * avgPricePerGuest;
  const netWeekly = Math.round(grossWeekly * 0.85);
  const netMonthly = netWeekly * 4;

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative bg-forest-950 text-cream-50 pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-forest-900 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center text-left">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-900 text-xs font-bold text-champagne-300 border border-forest-800">
              <ChefHat className="h-4 w-4" />
              <span>Chef Partner Network • Kenya</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
              Cook on Your Own Terms. <br />
              <span className="text-champagne-400 italic">Earn Direct Payouts.</span>
            </h1>

            <p className="text-sm sm:text-base text-forest-200 font-medium max-w-xl leading-relaxed">
              Build your private culinary reputation in Kenya. Set your own multi-course menu rates, accept bookings that fit your schedule, and receive guaranteed same-day M-Pesa payouts after every event.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/apply"
                className="px-8 py-4 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-black text-xs uppercase tracking-widest text-center shadow-lg transition-all active:scale-95"
              >
                Apply as a Private Chef →
              </Link>
              <Link
                href="/login?role=chef"
                className="px-6 py-4 rounded-2xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs uppercase tracking-widest text-center border border-forest-800 transition-all"
              >
                Chef Portal Login
              </Link>
            </div>
          </div>

          {/* EARNINGS CALCULATOR */}
          <div className="lg:col-span-5 bg-white text-forest-950 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-forest-100 space-y-6">
            <div className="border-b border-forest-100 pb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                Chef Earnings Estimator
              </span>
              <h3 className="font-serif text-2xl font-bold text-forest-950 mt-1">
                Estimate Your Monthly Take-Home
              </h3>
            </div>

            {/* Slider 1: Dinners per week */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-forest-600">Dinners per week:</span>
                <span className="text-forest-950">{dinnersPerWeek} events</span>
              </div>
              <input
                type="range"
                min={1}
                max={7}
                value={dinnersPerWeek}
                onChange={(e) => setDinnersPerWeek(Number(e.target.value))}
                className="w-full accent-forest-900"
              />
            </div>

            {/* Slider 2: Average Guests */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-forest-600">Average guests per event:</span>
                <span className="text-forest-950">{avgGuests} guests</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={avgGuests}
                onChange={(e) => setAvgGuests(Number(e.target.value))}
                className="w-full accent-forest-900"
              />
            </div>

            {/* Slider 3: Menu Price */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-forest-600">Your price per guest:</span>
                <span className="text-forest-950">KES {avgPricePerGuest.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={3000}
                max={10000}
                step={500}
                value={avgPricePerGuest}
                onChange={(e) => setAvgPricePerGuest(Number(e.target.value))}
                className="w-full accent-forest-900"
              />
            </div>

            {/* Total Estimated Payout */}
            <div className="bg-cream-50 rounded-2xl p-5 border border-forest-100 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                Estimated Net Earnings (After 15% Platform Fee)
              </span>
              <p className="font-serif text-3xl font-black text-forest-950">
                KES {netMonthly.toLocaleString()}
                <span className="text-xs font-normal text-forest-500"> / month</span>
              </p>
              <p className="text-[11px] text-forest-500">
                KES {netWeekly.toLocaleString()} / week from {dinnersPerWeek} dinner service(s)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHEF PARTNER BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-forest-600 px-3 py-1 bg-forest-100 rounded-full">
            Why Cook With Us
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950">
            A Transparent Marketplace for Independent Chefs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {[
            {
              title: "Guaranteed Escrow Payouts",
              desc: "Clients pay 100% of your culinary fee into escrow upon booking confirmation. Guaranteed same-day M-Pesa payout upon completion, with flexible ingredient sourcing (sourced by chef or supplied by client).",
              icon: <DollarSign className="h-6 w-6 text-forest-800" />,
            },
            {
              title: "You Set Menu Pricing & Schedule",
              desc: "You have complete autonomy. Define your minimum guest count, your dish courses, and which days you want to accept bookings.",
              icon: <Calendar className="h-6 w-6 text-forest-800" />,
            },
            {
              title: "Verified VIP Client Base",
              desc: "We screen clients and provide clear dietary and kitchen setup requirements in advance so you can arrive prepared.",
              icon: <ShieldCheck className="h-6 w-6 text-forest-800" />,
            },
          ].map((b, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-[32px] border border-forest-100 shadow-sm space-y-3"
            >
              <div className="h-12 w-12 rounded-2xl bg-cream-100 text-forest-900 flex items-center justify-center border border-forest-200">
                {b.icon}
              </div>
              <h3 className="font-serif text-lg font-bold text-forest-950">{b.title}</h3>
              <p className="text-xs text-forest-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE DISPATCHED GIGS BOARD */}
      <section className="bg-cream-100 border-t border-forest-100 py-20 px-4 sm:px-6 lg:px-8 text-left">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-900 text-white text-[10px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3 text-champagne-400" />
                <span>Uber Dispatch Feed</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950">
                Live Dispatched Gigs Awaiting Chefs
              </h2>
              <p className="text-xs text-forest-600 mt-1">
                Active requests submitted by diners across Kenya. Verified partner chefs can accept gigs instantly.
              </p>
            </div>

            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs uppercase tracking-wider transition-all shrink-0 shadow-md"
            >
              <span>Get Certified to Claim Gigs</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                id: "DISP-781",
                title: "Royal Swahili Seafood Feast",
                location: "Karen, Nairobi",
                date: "This Saturday, 19:30",
                guests: "8 Guests",
                payout: "KES 36,000",
                cuisine: "Swahili & Seafood",
                format: "In-Home Dining",
                urgency: "Dispatch Pending",
              },
              {
                id: "DISP-920",
                title: "Continental 4-Course Anniversary Dinner",
                location: "Spring Valley, Westlands",
                date: "Sunday, 20:00",
                guests: "4 Guests",
                payout: "KES 24,000",
                cuisine: "Continental & Fine Dining",
                format: "In-Home Dining",
                urgency: "Dispatch Pending",
              },
              {
                id: "DISP-644",
                title: "Nyama Choma & BBQ Birthday Celebration",
                location: "Runda Estate, Nairobi",
                date: "Next Friday, 14:00",
                guests: "14 Guests",
                payout: "KES 58,500",
                cuisine: "Nyama Choma & BBQ",
                format: "In-Home Dining",
                urgency: "High Demand",
              },
            ].map((gig) => (
              <div
                key={gig.id}
                className="bg-white rounded-3xl p-6 border border-forest-100 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-forest-500 bg-cream-100 px-2 py-0.5 rounded-lg">
                      #{gig.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                      {gig.urgency}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-forest-950 leading-snug">
                    {gig.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-forest-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-forest-500 shrink-0" />
                      <span>{gig.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-forest-500 shrink-0" />
                      <span>{gig.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Utensils className="h-3.5 w-3.5 text-forest-500 shrink-0" />
                      <span>{gig.guests} • {gig.format}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-forest-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-forest-400 block">Net Payout</span>
                    <strong className="text-base font-black text-forest-950">
                      {gig.payout}
                    </strong>
                  </div>

                  <a
                    href={`https://wa.me/254786530713?text=${encodeURIComponent(
                      `Hello Concierge! I am an active chef interested in claiming gig #${gig.id} (${gig.title} on ${gig.date}). Please verify my dispatch!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    Claim Gig →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
