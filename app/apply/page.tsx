"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChefHat,
  Sparkles,
  ChevronLeft,
  Check,
  Shield,
  Loader2,
  CheckCircle2,
  MapPin,
  Flame,
  Award,
  DollarSign,
  Utensils,
  Building2,
  Truck,
  Home,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/client";

const CUISINES = [
  "Swahili",
  "Seafood",
  "Nyama Choma",
  "BBQ",
  "Kenyan Traditional",
  "Continental",
  "Italian",
  "Fine Dining",
  "Indian",
  "Pan-Asian",
  "Pastry & Baking",
  "Vegan / Plant-Based",
  "French",
  "Mediterranean",
];

const DIETARY = [
  "Halal",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Keto",
  "Pescatarian",
  "Dairy-Free",
  "Nut-Free",
];

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    applicantType: "chef" as "chef" | "restaurant",
    restaurantName: "",
    restaurantRole: "Executive Chef",
    fullName: "",
    email: "",
    phone: "",
    nationalIdNumber: "",
    serviceFormat: "both" as "both" | "delivery_only" | "in_home",
    brandName: "",
    experienceYears: "5+ years",
    city: "Nairobi",
    neighborhood: "Kilimani",
    startingPrice: "4500",
    cuisines: ["Swahili", "Seafood"] as string[],
    dietary: ["Halal"] as string[],
    specialtyDish: "",
    bio: "",
    // Mandatory Vetting & Badges
    goodConductUploaded: true,
    goodConductCertNumber: "",
    foodSafetyCertified: true,
    foodSafetyCertNumber: "",
    haccpCertified: false,
    kitchenTastingAgreed: true,
  });

  // Calculate live application completeness toward the 97% Go-Live requirement
  const calculateApplyProgress = () => {
    let score = 0;
    if (formData.fullName.trim() && formData.email.trim() && formData.phone.trim()) score += 15;
    if (formData.nationalIdNumber.trim().length >= 6) score += 15;
    if (formData.goodConductUploaded || formData.goodConductCertNumber.trim()) score += 15;
    if (formData.foodSafetyCertified) score += 15;
    if (formData.kitchenTastingAgreed) score += 15;
    if (formData.applicantType === "restaurant" ? Boolean(formData.restaurantName.trim()) : true) score += 5;
    if (formData.serviceFormat) score += 5;
    if (formData.cuisines.length > 0) score += 10;
    if (formData.city && formData.neighborhood) score += 5;
    if (formData.startingPrice) score += 5;
    return Math.min(100, score);
  };

  const applyProgress = calculateApplyProgress();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("type") === "restaurant" || params.get("partner") === "restaurant") {
        setFormData((prev) => ({
          ...prev,
          applicantType: "restaurant",
          serviceFormat: "delivery_only",
        }));
      }
    }
  }, []);

  const supabase = createClient();

  const toggleCuisine = (c: string) => {
    setFormData((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(c)
        ? prev.cuisines.filter((i) => i !== c)
        : [...prev.cuisines, c],
    }));
  };

  const toggleDietary = (d: string) => {
    setFormData((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(d)
        ? prev.dietary.filter((i) => i !== d)
        : [...prev.dietary, d],
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.phone) {
        setError("Please enter your contact name, email, and phone number.");
        return;
      }
      if (!formData.nationalIdNumber.trim() || formData.nationalIdNumber.trim().length < 6) {
        setError("Please enter your Government National ID or Passport Number for identity verification.");
        return;
      }
      if (formData.applicantType === "restaurant" && !formData.restaurantName.trim()) {
        setError("Please enter your restaurant or establishment name.");
        return;
      }
    }
    if (step === 2) {
      if (formData.cuisines.length === 0) {
        setError("Please select at least one cuisine.");
        return;
      }
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const vettingNotes = `[Vetting: Compliance: ${formData.goodConductUploaded ? 'Verified' : 'Pending'}${formData.goodConductCertNumber ? ` (${formData.goodConductCertNumber})` : ''} • Food Safety: ${formData.foodSafetyCertified ? 'Verified' : 'Pending'} • HACCP: ${formData.haccpCertified ? 'Certified' : 'Standard'} • Nairobi Test Kitchen Tasting: ${formData.kitchenTastingAgreed ? 'Agreed' : 'Pending'}]`;

    const payload = {
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      national_id_number: formData.nationalIdNumber,
      partner_type: formData.applicantType,
      restaurant_name: formData.applicantType === "restaurant" ? formData.restaurantName : null,
      restaurant_role: formData.applicantType === "restaurant" ? formData.restaurantRole : null,
      service_formats: formData.serviceFormat === "delivery_only"
        ? ["delivery"]
        : formData.serviceFormat === "in_home"
        ? ["in_home"]
        : ["in_home", "delivery"],
      brand_name: formData.applicantType === "restaurant"
        ? `${formData.restaurantName} (${formData.restaurantRole || "Chef"})`
        : (formData.brandName || null),
      city: formData.city,
      neighborhood: formData.neighborhood,
      cuisines: formData.cuisines,
      dietary: formData.dietary,
      starting_price: parseInt(formData.startingPrice) || 4000,
      specialty_dish: formData.specialtyDish,
      bio: formData.applicantType === "restaurant"
        ? `[Restaurant Partner: ${formData.restaurantName} • Format: ${formData.serviceFormat === "delivery_only" ? "Fresh Delivery Only" : "In-Home & Delivery"}] ${vettingNotes} ${formData.bio}`
        : `[Service Format: ${formData.serviceFormat === "delivery_only" ? "Fresh Delivery Only" : "In-Home & Delivery"}] ${vettingNotes} ${formData.bio}`,
      status: "pending",
    };

    try {
      await supabase.from("chef_applications").insert([payload]);
      setSubmitted(true);
    } catch (err: any) {
      console.warn("Saving chef application:", err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 pt-32 pb-20">
          <div className="max-w-xl w-full bg-white rounded-2xl p-10 sm:p-12 border border-forest-100 text-center space-y-6">
            <div className="h-20 w-20 bg-forest-50 text-forest-700 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              {formData.applicantType === "restaurant" ? "Restaurant Partnership Received!" : "Application Received!"}
            </h1>
            <p className="text-sm text-forest-600 font-medium leading-relaxed">
              {formData.applicantType === "restaurant" ? (
                <>
                  Thank you for partnering with Book A Chef,{" "}
                  <span className="font-bold text-forest-900">{formData.fullName}</span> from{" "}
                  <span className="font-bold text-forest-900">{formData.restaurantName}</span>. Our hospitality
                  partnerships director will contact you on WhatsApp / Phone (
                  <span className="font-bold text-forest-900">{formData.phone}</span>) within 24 hours to
                  finalize your chef listings, signature tasting menus, and schedule availability.
                </>
              ) : (
                <>
                  Welcome to the Book A Chef partner queue,{" "}
                  <span className="font-bold text-forest-900">{formData.fullName}</span>. Our executive
                  chef verification team will contact you on WhatsApp / Phone (
                  <span className="font-bold text-forest-900">{formData.phone}</span>) within 24 hours to
                  schedule your tasting interview and finalize your verified profile.
                </>
              )}
            </p>
            <div className="pt-6 border-t border-forest-100 flex flex-col gap-3">
              <Link
                href="/chef-dashboard"
                className="w-full bg-forest-900 text-cream-50 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-forest-800 transition-all"
              >
                Preview Partner Dashboard →
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Wizard Column */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-100 text-[10px] font-black text-forest-700 uppercase tracking-widest mb-3">
                <ChefHat className="h-3.5 w-3.5" /> Chef Partner Onboarding
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold text-forest-950 tracking-tight leading-tight">
                Launch Your Private <br />
                <span className="text-champagne-600 italic">Chef Business.</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-forest-600 font-medium">
                Set your own rates per guest, cook for VIP clients across Nairobi and Diani, and receive guaranteed instant M-Pesa payouts after every dinner.
              </p>
            </div>

            {/* Live Profile Readiness Tracker: 97% Gate to Go Live */}
            <div className="bg-forest-950 text-cream-100 rounded-3xl p-5 sm:p-6 border border-forest-900 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-champagne-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-cream-100">
                    Profile Readiness Score
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-black ${applyProgress >= 97 ? "text-emerald-400" : "text-champagne-400"}`}>
                    {applyProgress}% Complete
                  </span>
                  <span className="text-[10px] text-forest-400 font-bold bg-forest-900 px-2 py-0.5 rounded-full border border-forest-800">
                    97% Required to Go Live
                  </span>
                </div>
              </div>

              <div className="w-full h-3 bg-forest-900 rounded-full overflow-hidden border border-forest-800">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    applyProgress >= 97 ? "bg-emerald-400" : "bg-gradient-to-r from-amber-400 to-champagne-400"
                  }`}
                  style={{ width: `${applyProgress}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-cream-200/80 pt-1">
                <span>🛡️ Verified National ID / Passport required for guest trust.</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-2.5 border border-forest-100">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    step >= s ? "bg-forest-900" : "bg-forest-100"
                  }`}
                />
              ))}
              <span className="text-xs font-black text-forest-900 px-3">Step {step} of 4</span>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {/* Step 1: Personal & Brand / Restaurant Details */}
            {step === 1 && (
              <div className="bg-white rounded-2xl p-8 sm:p-10 border border-forest-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-forest-950">
                    1. Choose Partner Type
                  </h2>
                  <span className="text-[11px] font-bold text-champagne-600 bg-forest-900 px-3 py-1 rounded-full w-fit">
                    Verified Kenya Partner
                  </span>
                </div>

                {/* Partner Type Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, applicantType: "chef" })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      formData.applicantType === "chef"
                        ? "border-forest-900 bg-forest-50/80 ring-2 ring-forest-900"
                        : "border-forest-100 hover:border-forest-200 bg-white"
                    }`}
                  >
                    <ChefHat className={`h-5 w-5 shrink-0 mt-0.5 ${formData.applicantType === "chef" ? "text-forest-900" : "text-forest-400"}`} />
                    <div>
                      <span className="text-xs font-bold text-forest-950 block">Independent Private Chef</span>
                      <span className="text-[11px] text-forest-500">Freelance or private culinary artisan</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, applicantType: "restaurant" })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      formData.applicantType === "restaurant"
                        ? "border-forest-900 bg-forest-50/80 ring-2 ring-forest-900"
                        : "border-forest-100 hover:border-forest-200 bg-white"
                    }`}
                  >
                    <Building2 className={`h-5 w-5 shrink-0 mt-0.5 ${formData.applicantType === "restaurant" ? "text-forest-900" : "text-forest-400"}`} />
                    <div>
                      <span className="text-xs font-bold text-forest-950 block">Restaurant / Kitchen Group</span>
                      <span className="text-[11px] text-forest-500">List your restaurant&apos;s executive chefs</span>
                    </div>
                  </button>
                </div>

                {/* Conditional Restaurant Fields */}
                {formData.applicantType === "restaurant" && (
                  <div className="p-4 rounded-2xl bg-cream-50/80 border border-champagne-400/30 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                        Restaurant / Establishment Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Talisman Karen, Seven Seafood, About Thyme"
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        className="w-full bg-white border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                        Chef Role / Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Executive Chef, Head Pastry Chef, Culinary Director"
                        value={formData.restaurantRole}
                        onChange={(e) => setFormData({ ...formData, restaurantRole: e.target.value })}
                        className="w-full bg-white border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    {formData.applicantType === "restaurant" ? "Lead Chef / Contact Representative *" : "Full Legal Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.applicantType === "restaurant" ? "e.g. Chef Mwangi / GM Jane Doe" : "e.g. Chef Amina Hassan"}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="contact@restaurant.co.ke"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      M-Pesa / Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0712 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>
                </div>

                {/* Government National ID / Passport Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      National ID or Passport Number *
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                      Identity Vetted
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 28941052 or A01489234"
                    value={formData.nationalIdNumber}
                    onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                  />
                  <p className="text-[11px] text-forest-500 italic">
                    Required for government identity verification and diner safety.
                  </p>
                </div>

                {/* Mandatory Chef Vetting & Badging Protocol Card */}
                <div className="p-5 rounded-3xl bg-forest-950 text-cream-50 space-y-4 border border-forest-800 shadow-md">
                  <div className="flex items-center justify-between border-b border-forest-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-champagne-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Vetting, Badges & Safety Clearances
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-champagne-300 bg-forest-900 px-2 py-0.5 rounded-full border border-forest-700">
                      Mandatory For Listing
                    </span>
                  </div>

                  {/* 1. Background & Safety Compliance Certificate */}
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.goodConductUploaded}
                        onChange={(e) => setFormData({ ...formData, goodConductUploaded: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded text-forest-900 focus:ring-forest-800 accent-forest-500"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">
                          Background &amp; Safety Compliance Certificate *
                        </span>
                        <span className="text-[11px] text-forest-300 block leading-snug">
                          Current government-issued background clearance certificate. Mandatory before accepting any booking.
                        </span>
                      </div>
                    </label>
                    {formData.goodConductUploaded && (
                      <input
                        type="text"
                        placeholder="Certificate / Reference No. (e.g. CR/2026/0491)"
                        value={formData.goodConductCertNumber}
                        onChange={(e) => setFormData({ ...formData, goodConductCertNumber: e.target.value })}
                        className="w-full bg-forest-900 border border-forest-800 rounded-xl px-3 py-2 text-xs font-medium text-cream-100 placeholder:text-forest-400 outline-none"
                      />
                    )}
                  </div>

                  {/* 2. Food Safety & Handler Certificate */}
                  <div className="space-y-2 pt-3 border-t border-forest-800/60">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.foodSafetyCertified}
                        onChange={(e) => setFormData({ ...formData, foodSafetyCertified: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded text-forest-900 focus:ring-forest-800 accent-forest-500"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">
                          Updated Food Safety & Medical Health Certification *
                        </span>
                        <span className="text-[11px] text-forest-300 block leading-snug">
                          County Public Health Food Handler medical certificate on file.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* 3. In-House Test Kitchen Tasting Assessment */}
                  <div className="space-y-2 pt-3 border-t border-forest-800/60">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.kitchenTastingAgreed}
                        onChange={(e) => setFormData({ ...formData, kitchenTastingAgreed: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded text-forest-900 focus:ring-forest-800 accent-forest-500"
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            In-House Test Kitchen Tasting Assessment (Nairobi) *
                          </span>
                          <span className="text-[9px] font-black text-champagne-300 bg-forest-900 px-2 py-0.5 rounded-full border border-champagne-400/40">
                            🍳 Earns Kitchen-Tasted Badge
                          </span>
                        </div>
                        <span className="text-[11px] text-forest-300 block leading-snug">
                          I agree to attend a live 2-hour cooking session at Book A Chef&apos;s Nairobi test kitchen for executive tasting and quality verification.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* 4. HACCP Certified (Badge) */}
                  <div className="space-y-2 pt-3 border-t border-forest-800/60">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.haccpCertified}
                        onChange={(e) => setFormData({ ...formData, haccpCertified: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded text-forest-900 focus:ring-forest-800 accent-sky-400"
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            I hold an International HACCP Food Safety Certification
                          </span>
                          <span className="text-[9px] font-black text-sky-200 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-400/50">
                            🛡️ Earns HACCP Badge
                          </span>
                        </div>
                        <span className="text-[11px] text-forest-300 block leading-snug">
                          Hazard Analysis Critical Control Point certification for high-tier banquet and fine dining food safety.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Service Model Preference */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Service Offering & Privacy Model *
                    </label>
                    {formData.applicantType === "restaurant" && (
                      <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        Restaurant Privacy Option
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, serviceFormat: "delivery_only" })}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                        formData.serviceFormat === "delivery_only"
                          ? "border-forest-900 bg-forest-50/80 ring-2 ring-forest-900/20"
                          : "border-forest-100 hover:border-forest-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-amber-700" />
                          <span className="text-xs font-bold text-forest-950">Fresh Delivery Only</span>
                        </div>
                        {formData.applicantType === "restaurant" && (
                          <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-forest-600 leading-snug">
                        Prepared in commercial kitchen and delivered hot in thermal presentation platters. No in-home client meetings (maximum chef privacy).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, serviceFormat: "both" })}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                        formData.serviceFormat === "both"
                          ? "border-forest-900 bg-forest-50/80 ring-2 ring-forest-900/20"
                          : "border-forest-100 hover:border-forest-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="h-4 w-4 text-forest-700" />
                        <span className="text-xs font-bold text-forest-950">Both In-Home & Delivery</span>
                      </div>
                      <p className="text-[11px] text-forest-600 leading-snug">
                        Cook live in client residences with full kitchen cleanup, or dispatch hot multi-course feast deliveries.
                      </p>
                    </button>
                  </div>
                </div>

                {formData.applicantType === "chef" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Culinary Brand / Studio Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Taste of the Coast / Atelier Amina"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl shadow-forest-950/20"
                >
                  Continue to Cuisines →
                </button>
              </div>
            )}

            {/* Step 2: Cuisines & Dietary */}
            {step === 2 && (
              <div className="bg-white rounded-2xl p-8 sm:p-10 border border-forest-100 space-y-6">
                <h2 className="text-xl font-bold text-forest-950">
                  2. Culinary Flavors & Dietary Specialties
                </h2>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Cuisine Styles You Master (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CUISINES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCuisine(c)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                          formData.cuisines.includes(c)
                            ? "bg-forest-900 text-white border-forest-900 shadow-sm"
                            : "bg-cream-50 text-forest-800 border-forest-100 hover:bg-cream-100"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-forest-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Dietary Requirements Accommodated
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDietary(d)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          formData.dietary.includes(d)
                            ? "bg-forest-900 text-white border-forest-900 shadow-sm"
                            : "bg-cream-50 text-forest-800 border-forest-100 hover:bg-cream-100"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-4 rounded-2xl border border-forest-200 text-xs font-bold text-forest-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl"
                  >
                    Continue to Experience & Rates →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Experience & Pricing */}
            {step === 3 && (
              <div className="bg-white rounded-2xl p-8 sm:p-10 border border-forest-100 space-y-5">
                <h2 className="text-xl font-bold text-forest-950">
                  3. Experience & Menu Pricing
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Years of Culinary Experience
                    </label>
                    <select
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none"
                    >
                      <option value="2-4 years">2-4 years</option>
                      <option value="5-8 years">5-8 years</option>
                      <option value="8+ years">8+ years</option>
                      <option value="Executive Chef / 15+ yrs">Executive Chef / 15+ yrs</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Starting Rate / Guest (KES) *
                    </label>
                    <input
                      type="number"
                      value={formData.startingPrice}
                      onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Your Signature Dish
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tamarind lobster with saffron coconut rice"
                    value={formData.specialtyDish}
                    onChange={(e) => setFormData({ ...formData, specialtyDish: e.target.value })}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3.5 font-bold text-forest-950 text-xs outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-4 rounded-2xl border border-forest-200 text-xs font-bold text-forest-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl"
                  >
                    Continue to Bio →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Bio & Review */}
            {step === 4 && (
              <div className="bg-white rounded-2xl p-8 sm:p-10 border border-forest-100 space-y-5">
                <h2 className="text-xl font-bold text-forest-950">
                  4. Chef Biography & Application Review
                </h2>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Chef Bio & Culinary Background *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell diners about your culinary journey, restaurant training, and what makes your dining table special..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-4 font-medium text-forest-950 text-xs outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-cream-50 border border-forest-100 text-xs space-y-1">
                  <p className="font-bold text-forest-950">Summary Review:</p>
                  <p className="text-forest-700">
                    {formData.fullName} • {formData.brandName || "Independent"} • {formData.cuisines.join(", ")}
                  </p>
                  <p className="text-forest-700">Rate: KES {formData.startingPrice} / guest</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-4 rounded-2xl border border-forest-200 text-xs font-bold text-forest-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Chef Application ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Info Column */}
          <div className="lg:col-span-5 bg-forest-950 text-cream-100 rounded-2xl p-8 border border-forest-900 shadow-2xl space-y-6 text-left">
            <h3 className="text-2xl font-bold text-white">
              Why Partner With Book A Chef?
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <ChefHat className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-white">In-House Kitchen Tasting</h4>
                    <span className="text-[9px] font-black text-champagne-300 bg-forest-900 px-1.5 py-0.5 rounded border border-champagne-400/30">
                      🍳 Verified Badge
                    </span>
                  </div>
                  <p className="text-forest-300 mt-0.5">
                    Cook live for our culinary directors at our private Nairobi test kitchen. Earning the Kitchen-Tasted badge boosts your booking conversion 3x.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-white">HACCP & Food Safety Badges</h4>
                    <span className="text-[9px] font-black text-sky-200 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-400/40">
                      🛡️ Verified Badge
                    </span>
                  </div>
                  <p className="text-forest-300 mt-0.5">
                    HACCP-certified chefs receive an official blue badge verifying medical-grade sanitation, unlocking high-budget diplomatic & corporate bookings.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Background & Safety Compliance</h4>
                  <p className="text-forest-300 mt-0.5">
                    Uploading your current background clearance certificate certifies total trust and safety for private homes in Karen, Runda, and Muthaiga.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-champagne-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Escrow Payment Protection</h4>
                  <p className="text-forest-300 mt-0.5">
                    100% culinary fee escrow collected before you step into the kitchen; instant guaranteed M-Pesa release upon event completion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
