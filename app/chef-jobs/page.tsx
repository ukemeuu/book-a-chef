"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChefHat,
  ShieldCheck,
  DollarSign,
  Calendar,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ChefJobsPage() {
  const [dinnersPerWeek, setDinnersPerWeek] = useState(3);
  const [avgGuests, setAvgGuests] = useState(6);
  const [avgPricePerGuest, setAvgPricePerGuest] = useState(4500);

  // Income estimate.
  //
  // The 85/15 split is NOT approved. It is shown here only as an illustration
  // so the calculator is meaningful, and is labelled as an estimate in the UI.
  // The live rate lives in platform_settings and must not be asserted publicly
  // until approved. Do not widen this to a promise.
  const LEGACY_PAYOUT_RATE = 0.85;
  const grossWeekly = dinnersPerWeek * avgGuests * avgPricePerGuest;
  const netWeekly = Math.round(grossWeekly * LEGACY_PAYOUT_RATE);
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

            <h1 className="text-4xl sm:text-6xl text-white tracking-tight leading-tight">
              Cook on Your Own Terms. <br />
              <span className="text-champagne-400 italic">Earn Direct Payouts.</span>
            </h1>

            <p className="text-sm sm:text-base text-forest-200 font-medium max-w-xl leading-relaxed">
              Build your private culinary reputation in Kenya. Set your own multi-course menu rates, accept bookings that fit your schedule, and receive guaranteed same-day M-Pesa payouts after every event.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/apply"
                className="px-8 py-4 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 text-xs uppercase tracking-widest text-center shadow-lg transition-all active:scale-95"
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
          <div className="lg:col-span-5 bg-white text-forest-950 rounded-2xl p-6 sm:p-8 shadow-2xl border border-forest-100 space-y-6">
            <div className="border-b border-forest-100 pb-4">
              <span className="text-[10px] uppercase tracking-widest text-forest-500">
                Chef Earnings Estimator
              </span>
              <h3 className="text-2xl font-bold text-forest-950 mt-1">
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
              <span className="text-[10px] uppercase tracking-widest text-forest-500">
                Estimated Take-Home
              </span>
              <p className="text-3xl text-forest-950">
                KES {netMonthly.toLocaleString()}
                <span className="text-xs font-normal text-forest-500"> / month</span>
              </p>
              <p className="text-[11px] text-forest-500">
                KES {netWeekly.toLocaleString()} / week from {dinnersPerWeek} dinner service(s)
              </p>
              <p className="text-[11px] text-forest-400 pt-1 border-t border-forest-100">
                Illustration only, assuming the current indicative 85/15 split.
                Your final platform fee is confirmed in writing at onboarding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHEF PARTNER BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-forest-600 px-3 py-1 bg-forest-100 rounded-full">
            Why Cook With Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-forest-950">
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
              className="bg-white p-8 rounded-2xl border border-forest-100 shadow-sm space-y-3"
            >
              <div className="h-12 w-12 rounded-2xl bg-cream-100 text-forest-900 flex items-center justify-center border border-forest-200">
                {b.icon}
              </div>
              <h3 className="text-lg font-bold text-forest-950">{b.title}</h3>
              <p className="text-xs text-forest-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
