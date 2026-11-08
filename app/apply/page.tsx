"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Check,
  Shield,
  Loader2,
  CheckCircle2,
  MailCheck,
  ArrowRight,
  Truck,
  Home,
  Lock,
  Info,
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

type ServiceFormat = "both" | "in_home" | "delivery_only";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  nationalIdNumber: string;
  city: string;
  neighborhood: string;
  brandName: string;
  experienceYears: string;
  startingPrice: string;
  cuisines: string[];
  dietary: string[];
  specialtyDish: string;
  bio: string;
  serviceFormat: ServiceFormat;
  goodConduct: boolean;
  goodConductCert: string;
  foodSafety: boolean;
  foodSafetyCert: string;
  haccp: boolean;
  kitchenTasting: boolean;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  nationalIdNumber: "",
  city: "Nairobi",
  neighborhood: "Kilimani",
  brandName: "",
  experienceYears: "5-8 years",
  startingPrice: "4500",
  cuisines: ["Swahili", "Seafood"],
  dietary: ["Halal"],
  specialtyDish: "",
  bio: "",
  serviceFormat: "both",
  goodConduct: false,
  goodConductCert: "",
  foodSafety: false,
  foodSafetyCert: "",
  haccp: false,
  kitchenTasting: true,
};

const STEPS = ["Your account", "Your kitchen", "Verification"] as const;

function formatServiceFormats(format: ServiceFormat): string[] {
  if (format === "in_home") return ["in_home"];
  if (format === "delivery_only") return ["delivery"];
  return ["in_home", "delivery"];
}

export default function ApplyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: "confirmed"; email: string }
    | { kind: "signin"; email: string }
    | { kind: "existing"; message: string; code: string }
    | null
  >(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // A signed-in chef who lands here should not be asked to create a second
  // account. We keep their email locked to the session and skip the password.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user?.email) return;
      setSessionEmail(data.user.email);
      setForm((prev) => ({
        ...prev,
        email: data.user!.email!,
        fullName:
          prev.fullName ||
          String(data.user!.user_metadata?.full_name || "") ||
          "",
      }));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "cuisines" | "dietary", value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!form.fullName.trim()) return "Enter your full legal name.";
      if (!form.email.trim()) return "Enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        return "That email address does not look right.";
      if (!form.phone.trim()) return "Enter the phone number clients can reach you on.";
      if (!sessionEmail && form.password.length < 8)
        return "Choose a password of at least 8 characters — you will use it to sign in.";
      if (form.nationalIdNumber.trim().length < 6)
        return "Enter your National ID or passport number for verification.";
      if (!form.city.trim() || !form.neighborhood.trim())
        return "Tell us your city and neighbourhood.";
      return null;
    }

    if (index === 1) {
      if (form.cuisines.length === 0) return "Select at least one cuisine you cook.";
      if (!Number(form.startingPrice) || Number(form.startingPrice) < 1000)
        return "Set a starting rate per guest of at least KES 1,000.";
      return null;
    }

    if (form.bio.trim().length < 50)
      return "Write at least 50 characters about your culinary background.";
    if (!form.goodConduct)
      return "Confirm you hold a current background clearance certificate.";
    if (!form.foodSafety)
      return "Confirm you hold a food handler / medical certificate.";
    return null;
  };

  const next = () => {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const problem = validateStep(i);
      if (problem) {
        setStep(i);
        setError(problem);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chef/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: sessionEmail ? undefined : form.password,
          nationalIdNumber: form.nationalIdNumber,
          city: form.city,
          neighborhood: form.neighborhood,
          brandName: form.brandName,
          experienceYears: form.experienceYears,
          startingPrice: Number(form.startingPrice),
          cuisines: form.cuisines,
          dietary: form.dietary,
          specialtyDish: form.specialtyDish,
          bio: form.bio,
          serviceFormats: formatServiceFormats(form.serviceFormat),
          vetting: {
            goodConduct: form.goodConduct,
            goodConductCert: form.goodConductCert,
            foodSafety: form.foodSafety,
            foodSafetyCert: form.foodSafetyCert,
            haccp: form.haccp,
            kitchenTasting: form.kitchenTasting,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload.code === "ACCOUNT_EXISTS" || payload.code === "APPLICATION_EXISTS") {
          setResult({
            kind: "existing",
            message:
              payload.error ||
              "An account with this email already exists. Sign in to continue.",
            code: payload.code,
          });
          return;
        }
        setError(payload.error || "We could not submit your application. Try again.");
        return;
      }

      if (payload.requires_confirmation) {
        setResult({ kind: "confirmed", email: form.email });
        return;
      }

      // The account exists now. Sign in so the applicant lands on their
      // dashboard instead of a dead thank-you screen.
      if (!sessionEmail && form.password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (!signInError) {
          router.push("/chef-dashboard?welcome=1");
          router.refresh();
          return;
        }
      }

      // Already signed in: go straight to the applicant workspace rather than
      // telling a signed-in chef to sign in.
      if (sessionEmail) {
        router.push("/chef-dashboard?welcome=1");
        router.refresh();
        return;
      }

      setResult({ kind: "signin", email: form.email });
    } catch (err: any) {
      setError(err?.message || "Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const isExisting = result.kind === "existing";
    const needsEmail = result.kind === "confirmed";

    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 pt-32 pb-20">
          <div className="w-full max-w-xl bg-white rounded-2xl p-8 sm:p-10 border border-forest-100 text-center space-y-5">
            <div
              className={`h-16 w-16 rounded-2xl mx-auto flex items-center justify-center ${
                isExisting
                  ? "bg-amber-50 text-amber-700"
                  : "bg-forest-50 text-forest-800"
              }`}
            >
              {isExisting ? (
                <Info className="h-8 w-8" />
              ) : needsEmail ? (
                <MailCheck className="h-8 w-8" />
              ) : (
                <CheckCircle2 className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-forest-950">
                {isExisting
                  ? "You already have an account"
                  : needsEmail
                  ? "Confirm your email"
                  : "Application received"}
              </h1>
              <p className="text-sm text-forest-600 leading-relaxed">
                {isExisting ? (
                  result.message
                ) : needsEmail ? (
                  <>
                    We saved your application. Open the confirmation link we
                    sent to <strong className="text-forest-900">{result.email}</strong>,
                    then sign in to track your approval and finish your profile.
                  </>
                ) : (
                  <>
                    Your application is in the review queue. Sign in with{" "}
                    <strong className="text-forest-900">{result.email}</strong> to
                    see your status and finish your profile while you wait.
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-cream-50 border border-forest-100 p-4 text-left space-y-2">
              <p className="text-xs font-bold text-forest-950 uppercase tracking-wide">
                What happens next
              </p>
              <ol className="text-xs text-forest-600 space-y-1.5 list-decimal list-inside">
                <li>Our team reviews your application (usually within 24 hours).</li>
                <li>We check your certificates and confirm your identity.</li>
                <li>Once approved, your profile goes live in the directory.</li>
              </ol>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                href={
                  sessionEmail
                    ? "/chef-dashboard"
                    : `/login?redirect=${encodeURIComponent("/chef-dashboard")}`
                }
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-950 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-forest-800 transition-colors"
              >
                {sessionEmail ? "Go to my chef dashboard" : "Sign in to your chef dashboard"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="w-full py-3 rounded-xl border border-forest-200 text-forest-800 font-medium text-sm hover:bg-cream-50 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl bg-white border border-forest-200 px-4 py-3 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";
  const labelClass = "block text-xs font-bold text-forest-950 mb-1.5";

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-6">
            <header className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-forest-100 px-3 py-1 text-[11px] font-bold text-forest-700">
                <ChefHat className="h-3.5 w-3.5" />
                Chef onboarding
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-forest-950">
                Put your cooking in front of customers
              </h1>
              <p className="text-sm text-forest-600 max-w-xl">
                One application, one profile. Show what you cook, publish your
                phone number, and let customers contact you directly.
              </p>
            </header>

            {/* Stepper */}
            <ol className="flex items-center gap-2">
              {STEPS.map((label, index) => {
                const state =
                  index < step ? "done" : index === step ? "current" : "todo";
                return (
                  <li key={label} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        state === "todo" ? "bg-forest-100" : "bg-forest-950"
                      }`}
                    />
                    <span
                      className={`mt-1.5 block text-[11px] font-medium ${
                        state === "current"
                          ? "text-forest-950"
                          : state === "done"
                          ? "text-forest-600"
                          : "text-forest-400"
                      }`}
                    >
                      {index + 1}. {label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 space-y-5">
              {step === 0 && (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-forest-950">
                      Create your chef account
                    </h2>
                    <p className="text-xs text-forest-500 mt-1">
                      You will use this email and password to sign in and manage
                      your public profile.
                    </p>
                  </div>

                  {sessionEmail && (
                    <div className="rounded-xl bg-forest-50 border border-forest-100 px-4 py-3 text-xs text-forest-700">
                      Signed in as <strong>{sessionEmail}</strong>. This
                      application will be attached to your existing account.
                    </div>
                  )}

                  <div>
                    <label className={labelClass} htmlFor="fullName">
                      Full legal name
                    </label>
                    <input
                      id="fullName"
                      className={inputClass}
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="e.g. Amina Hassan"
                      autoComplete="name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        className={inputClass}
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={Boolean(sessionEmail)}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="phone">
                        M-Pesa phone
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className={inputClass}
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="0712 345 678"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {!sessionEmail && (
                    <div>
                      <label className={labelClass} htmlFor="password">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                        <input
                          id="password"
                          type="password"
                          className={`${inputClass} pl-10`}
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          minLength={8}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelClass} htmlFor="nationalId">
                      National ID or passport number
                    </label>
                    <input
                      id="nationalId"
                      className={inputClass}
                      value={form.nationalIdNumber}
                      onChange={(e) => update("nationalIdNumber", e.target.value)}
                      placeholder="e.g. 28941052"
                    />
                    <p className="mt-1.5 text-[11px] text-forest-500">
                      Used for identity verification only. Never shown on your
                      public listing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor="city">
                        City
                      </label>
                      <input
                        id="city"
                        className={inputClass}
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="neighborhood">
                        Neighbourhood
                      </label>
                      <input
                        id="neighborhood"
                        className={inputClass}
                        value={form.neighborhood}
                        onChange={(e) => update("neighborhood", e.target.value)}
                        placeholder="e.g. Kilimani"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-forest-950">
                      Your kitchen
                    </h2>
                    <p className="text-xs text-forest-500 mt-1">
                      Customers browse by cuisine and area — this is what helps
                      them find you.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="brandName">
                      Culinary brand or studio name (optional)
                    </label>
                    <input
                      id="brandName"
                      className={inputClass}
                      value={form.brandName}
                      onChange={(e) => update("brandName", e.target.value)}
                      placeholder="e.g. Taste of the Coast"
                    />
                  </div>

                  <div>
                    <span className={labelClass}>Cuisines you cook</span>
                    <div className="flex flex-wrap gap-2">
                      {CUISINES.map((cuisine) => {
                        const selected = form.cuisines.includes(cuisine);
                        return (
                          <button
                            key={cuisine}
                            type="button"
                            onClick={() => toggle("cuisines", cuisine)}
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? "bg-forest-950 text-white border-forest-950"
                                : "bg-white text-forest-700 border-forest-200 hover:border-forest-400"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {cuisine}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>Dietary specialties</span>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY.map((item) => {
                        const selected = form.dietary.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggle("dietary", item)}
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? "bg-forest-950 text-white border-forest-950"
                                : "bg-white text-forest-700 border-forest-200 hover:border-forest-400"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>How do you want to work?</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          value: "in_home" as ServiceFormat,
                          icon: Home,
                          title: "In-home dining",
                          body: "Cook and serve in the client's kitchen, including cleanup.",
                        },
                        {
                          value: "delivery_only" as ServiceFormat,
                          icon: Truck,
                          title: "Cook and deliver",
                          body: "Prep in your kitchen and deliver hot, plated food.",
                        },
                      ].map((option) => {
                        const Icon = option.icon;
                        const selected = form.serviceFormat === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => update("serviceFormat", option.value)}
                            aria-pressed={selected}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              selected
                                ? "border-forest-950 bg-forest-50/60"
                                : "border-forest-200 hover:border-forest-400"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-forest-700" />
                              <span className="text-sm font-bold text-forest-950">
                                {option.title}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-forest-600 leading-snug">
                              {option.body}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => update("serviceFormat", "both")}
                      aria-pressed={form.serviceFormat === "both"}
                      className={`mt-3 w-full rounded-xl border px-4 py-2.5 text-left text-xs font-medium transition-colors ${
                        form.serviceFormat === "both"
                          ? "border-forest-950 bg-forest-50/60 text-forest-950"
                          : "border-forest-200 text-forest-700 hover:border-forest-400"
                      }`}
                    >
                      I can do both — in-home dining and delivery
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor="startingPrice">
                        Starting rate per guest (KES)
                      </label>
                      <input
                        id="startingPrice"
                        type="number"
                        min={1000}
                        step={100}
                        className={inputClass}
                        value={form.startingPrice}
                        onChange={(e) => update("startingPrice", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="experienceYears">
                        Experience
                      </label>
                      <select
                        id="experienceYears"
                        className={inputClass}
                        value={form.experienceYears}
                        onChange={(e) => update("experienceYears", e.target.value)}
                      >
                        <option value="2-4 years">2–4 years</option>
                        <option value="5-8 years">5–8 years</option>
                        <option value="8+ years">8+ years</option>
                        <option value="Executive Chef / 15+ yrs">
                          Executive chef, 15+ years
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="specialtyDish">
                      Signature dish (optional)
                    </label>
                    <input
                      id="specialtyDish"
                      className={inputClass}
                      value={form.specialtyDish}
                      onChange={(e) => update("specialtyDish", e.target.value)}
                      placeholder="e.g. Tamarind lobster with saffron coconut rice"
                    />
                    <p className="mt-1.5 text-[11px] text-forest-500">
                      We turn this into your first menu when your listing is approved.
                    </p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-forest-950">
                      Verification and your story
                    </h2>
                    <p className="text-xs text-forest-500 mt-1">
                      Clients are inviting you into their homes. These checks are
                      what make that possible.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="bio">
                      Culinary background
                    </label>
                    <textarea
                      id="bio"
                      rows={5}
                      className={`${inputClass} resize-y`}
                      value={form.bio}
                      onChange={(e) => update("bio", e.target.value)}
                      placeholder="Where you trained, kitchens you have run, the food you are known for…"
                    />
                    <p className="mt-1.5 text-[11px] text-forest-500">
                      {form.bio.trim().length}/50 characters minimum
                    </p>
                  </div>

                  <div className="rounded-2xl border border-forest-100 bg-cream-50/60 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-forest-700" />
                      <span className="text-xs font-bold uppercase tracking-wide text-forest-950">
                        Compliance
                      </span>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.goodConduct}
                        onChange={(e) => update("goodConduct", e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-forest-950"
                      />
                      <span className="text-xs text-forest-700 leading-snug">
                        <strong className="text-forest-950">
                          Background clearance certificate
                        </strong>{" "}
                        — a current government-issued certificate of good conduct.
                      </span>
                    </label>

                    {form.goodConduct && (
                      <input
                        className={inputClass}
                        value={form.goodConductCert}
                        onChange={(e) => update("goodConductCert", e.target.value)}
                        placeholder="Certificate reference (e.g. CR/2026/0491)"
                      />
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.foodSafety}
                        onChange={(e) => update("foodSafety", e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-forest-950"
                      />
                      <span className="text-xs text-forest-700 leading-snug">
                        <strong className="text-forest-950">
                          Food handler / medical certificate
                        </strong>{" "}
                        — county public health clearance.
                      </span>
                    </label>

                    {form.foodSafety && (
                      <input
                        className={inputClass}
                        value={form.foodSafetyCert}
                        onChange={(e) => update("foodSafetyCert", e.target.value)}
                        placeholder="Certificate reference (optional)"
                      />
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.haccp}
                        onChange={(e) => update("haccp", e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-forest-950"
                      />
                      <span className="text-xs text-forest-700 leading-snug">
                        <strong className="text-forest-950">HACCP certified</strong>{" "}
                        — international food safety certification (optional).
                      </span>
                    </label>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-forest-100 p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.kitchenTasting}
                      onChange={(e) => update("kitchenTasting", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-forest-950"
                    />
                    <span className="text-xs text-forest-700 leading-snug">
                      <strong className="text-forest-950">
                        I can attend a tasting at the Nairobi test kitchen.
                      </strong>{" "}
                      A two-hour session with our culinary team. It is how the
                      Kitchen-Tasted badge is earned.
                    </span>
                  </label>

                  <div className="rounded-xl bg-cream-50 border border-forest-100 p-4 space-y-1.5 text-xs text-forest-600">
                    <p className="font-bold text-forest-950">Review</p>
                    <p>
                      {form.fullName || "Your name"} ·{" "}
                      {form.brandName || "Independent chef"} · {form.city}
                    </p>
                    <p>{form.cuisines.join(", ")}</p>
                    <p>KES {Number(form.startingPrice).toLocaleString()} per guest</p>
                    <p>
                      {form.serviceFormat === "both"
                        ? "In-home dining and delivery"
                        : form.serviceFormat === "in_home"
                        ? "In-home dining only"
                        : "Cook and deliver only"}
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    className="sm:w-auto px-5 py-3.5 rounded-xl border border-forest-200 text-sm font-medium text-forest-800 hover:bg-cream-50 transition-colors"
                  >
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-forest-950 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-forest-800 transition-colors"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-forest-950 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-forest-800 transition-colors disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit application"
                    )}
                  </button>
                )}
              </div>

              <p className="text-center text-[11px] text-forest-500">
                Already applied?{" "}
                <Link
                  href="/login?redirect=%2Fchef-dashboard"
                  className="font-medium text-forest-950 underline underline-offset-2"
                >
                  Sign in to check your status
                </Link>
              </p>
            </div>
          </div>

          {/* Side panel */}
          <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-forest-100 p-6 space-y-4">
              <h3 className="text-base font-bold text-forest-950">
                What you get
              </h3>
              <ul className="space-y-3 text-sm text-forest-600">
                {[
                  {
                    title: "A profile, not a listing",
                    body: "Customers browse the directory and contact you directly. No dispatch, no bidding.",
                  },
                  {
                    title: "You set the rate",
                    body: "Your per-guest price is your price. Customers see it before they call.",
                  },
                  {
                    title: "Direct contact",
                    body: "Your phone number and WhatsApp are on your public profile. No middleman.",
                  },
                  {
                    title: "Show your menus",
                    body: "Publish your signature menus and cuisines so customers know what you cook.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-forest-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-forest-950 block text-xs font-bold">
                        {item.title}
                      </strong>
                      <span className="text-xs">{item.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-forest-100 p-6 space-y-2">
              <h3 className="text-sm font-bold text-forest-950">
                The 97% rule
              </h3>
              <p className="text-xs text-forest-600 leading-relaxed">
                Your profile goes live at 97% completeness: identity,
                certificates, at least one menu, photos, and your service areas.
                Your dashboard shows exactly what is missing, so nothing is a
                mystery.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-forest-100 p-6 space-y-2">
              <h3 className="text-sm font-bold text-forest-950">
                Need help applying?
              </h3>
              <p className="text-xs text-forest-600 leading-relaxed">
                Message the onboarding team on WhatsApp and we will finish the
                application with you.
              </p>
              <a
                href="https://wa.me/254786530713?text=Hi%20Book%20A%20Chef%2C%20I%20need%20help%20with%20my%20chef%20application"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-950 underline underline-offset-2 hover:text-forest-700 transition-colors"
              >
                Chat with the onboarding team
              </a>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}