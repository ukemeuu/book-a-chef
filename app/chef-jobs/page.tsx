"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChefHat,
  ShieldCheck,
  Phone,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ChefJobsPage() {
  const [dinnersPerWeek, setDinnersPerWeek] = useState(3);
  const [avgGuests, setAvgGuests] = useState(6);
  const [avgPricePerGuest, setAvgPricePerGuest] = useState(4500);

  const grossWeekly = dinnersPerWeek * avgGuests * avgPricePerGuest;
  const grossMonthly = grossWeekly * 4;

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative bg-forest-950 text-cream-50 pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-forest-900 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center text-left">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-900 text-xs font-bold text-champagne-300 border border-forest-800">
              <ChefHat className="h-4 w-4" />
              <span>Chef Directory • Kenya</span>
            </div>

            <h1 className="text-4xl sm:text-6xl text-white tracking-tight leading-tight">
              Put your cooking
              <br />
              <span className="text-champagne-400 italic">in front of customers.</span>
            </h1>

            <p className="text-sm sm:text-base text-forest-200 font-medium max-w-xl leading-relaxed">
              Join the Book A Chef directory. Show what you cook, publish your
              phone number, and let customers call or WhatsApp you directly. No
              booking forms, no middleman.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/apply"
                className="px-8 py-4 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 text-xs uppercase tracking-widest text-center shadow-lg transition-all active:scale-95"
              >
                Apply to join →
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
                Earnings estimator
              </span>
              <h3 className="text-2xl font-bold text-forest-950 mt-1">
                See what you could earn
              </h3>
            </div>

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

            <div className="bg-cream-50 rounded-2xl p-5 border border-forest-100 space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-forest-500">
                Estimated gross
              </span>
              <p className="text-3xl text-forest-950">
                KES {grossMonthly.toLocaleString()}
                <span className="text-xs font-normal text-forest-500"> / month</span>
              </p>
              <p className="text-[11px] text-forest-500">
                KES {grossWeekly.toLocaleString()} / week from {dinnersPerWeek} dinner
                service(s)
              </p>
              <p className="text-[11px] text-forest-400 pt-1 border-t border-forest-100">
                Illustration only. You set your own rates and keep every booking
                you agree to directly with the customer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-forest-600 px-3 py-1 bg-forest-100 rounded-full">
            Why join
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-forest-950">
            A directory built for independent chefs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {[
            {
              title: "Customers contact you directly",
              desc: "Your phone number and WhatsApp are on your public profile. No platform messaging, no middleman taking a cut.",
              icon: <Phone className="h-6 w-6 text-forest-800" />,
            },
            {
              title: "You set your own rates",
              desc: "Publish your per-guest price and your menus. Customers see exactly what you cook before they call.",
              icon: <BadgeCheck className="h-6 w-6 text-forest-800" />,
            },
            {
              title: "Verified and trusted",
              desc: "Every profile is ID-checked and vetted by our team before it goes live, so customers know you're real.",
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

        <div className="mt-12 text-center">
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors"
          >
            Start your application
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
