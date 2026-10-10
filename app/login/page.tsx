"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Phone,
  ChevronLeft,
  Loader2,
  ChefHat,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const redirectTo = searchParams.get("redirect") || "";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot_password">(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError || !data.user) {
        setError(
          authError?.message === "Invalid login credentials"
            ? "Invalid email or password."
            : authError?.message || "Sign in failed."
        );
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const userRole = profile?.role || (data.user.user_metadata?.role as any) || "client";

      if (userRole === "admin") {
        window.location.href = "/admin";
      } else if (userRole === "chef") {
        window.location.href = "/chef-dashboard";
      } else if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "client",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "client",
          });
        } catch (_) {}

        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInData?.session) {
          setSuccessMessage("Account created! Redirecting...");
          // Route by role, not to a hardcoded customer dashboard. An admin or
          // chef who registers here would otherwise be parked on a bookings
          // page that is not theirs.
          const { data: newProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", signInData.user.id)
            .maybeSingle();

          const home =
            newProfile?.role === "admin"
              ? "/admin"
              : newProfile?.role === "chef"
              ? "/chef-dashboard"
              : redirectTo || "/dashboard";

          window.location.href = home;
          return;
        }

        setMode("signin");
        setSuccessMessage("Account created! Please sign in.");
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://bookachef.co.ke"}/dashboard`,
      });

      if (resetError) {
        setError(resetError.message || "Failed to send reset link.");
      } else {
        setSuccessMessage("Check your inbox for a reset link.");
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";
  const labelClass = "block text-xs font-bold text-forest-950 mb-1.5";

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-forest-950 flex items-center justify-center">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-serif font-bold text-forest-950">Book A Chef</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
          {mode === "signin" && "Welcome back"}
          {mode === "signup" && "Create your account"}
          {mode === "forgot_password" && "Reset password"}
        </h1>
        <p className="mt-1.5 text-sm text-forest-500">
          {mode === "signin" && "Sign in to request a private chef"}
          {mode === "signup" && "Join Book A Chef in seconds"}
          {mode === "forgot_password" && "We'll email you a reset link"}
        </p>
      </div>

      {/* Mode Toggle */}
      {mode !== "forgot_password" && (
        <div className="flex bg-cream-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "signin" ? "bg-white text-forest-950 shadow-sm" : "text-forest-500 hover:text-forest-950"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "signup" ? "bg-white text-forest-950 shadow-sm" : "text-forest-500 hover:text-forest-950"
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {successMessage}
        </div>
      )}

      {/* Forms */}
      {mode === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode("forgot_password"); setError(null); }}
              className="text-sm text-forest-500 hover:text-forest-950 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="text"
                required
                placeholder="Wanjiru Mwangi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="tel"
                required
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
          </button>
        </form>
      )}

      {mode === "forgot_password" && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); }}
              className="text-sm text-forest-500 hover:text-forest-950 transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        </form>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-forest-400">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-forest-950">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline hover:text-forest-950">Privacy Policy</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Top bar */}
      <div className="px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-forest-600 hover:text-forest-950 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-forest-100 p-6 sm:p-8">
            <Suspense
              fallback={
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
