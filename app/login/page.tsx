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
  Sparkles,
  ShieldCheck,
  Shield,
  Utensils,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const initialRole = searchParams.get("role") === "chef" ? "chef" : "client";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot_password">(initialTab);
  const [selectedRole, setSelectedRole] = useState<"client" | "chef" | "admin">(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
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
            ? "Invalid email or password. Please verify your credentials or register an account."
            : authError?.message || "Sign in failed. Please check your credentials."
        );
        setLoading(false);
        return;
      }

      // Fetch user profile to verify role and approval status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const userRole = profile?.role || (data.user.user_metadata?.role as any) || "client";

      // Role check: If attempting to sign in as Chef
      if (selectedRole === "chef") {
        if (userRole !== "chef" && userRole !== "admin") {
          setError(
            "This account is registered as a Client/Diner. Please switch to Client sign-in, or submit a Chef Application."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Check if chef is approved in the chefs or applications table
        const { data: chefRecord } = await supabase
          .from("chefs")
          .select("verified, is_available")
          .eq("user_id", data.user.id)
          .single();

        const { data: appRecord } = await supabase
          .from("chef_applications")
          .select("status")
          .eq("email", email.trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (appRecord && appRecord.status === "pending") {
          setError(
            "Your Chef Partner application is currently under review by our executive curation team. You will receive an approval notification via WhatsApp / Email once verified."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (appRecord && appRecord.status === "rejected") {
          setError(
            "Your application to cook with Book A Chef was not approved. Please contact concierge@bookachef.co.ke for inquiries."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        window.location.href = "/chef-dashboard";
        return;
      }

      // Role check: If attempting to sign in as Admin
      if (selectedRole === "admin") {
        if (userRole !== "admin") {
          setError("Access denied. This account does not possess Super Admin privileges.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        window.location.href = "/admin";
        return;
      }

      // Default: Client / Diner
      if (userRole === "admin") {
        window.location.href = "/admin";
      } else if (userRole === "chef") {
        window.location.href = "/chef-dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (selectedRole === "chef") {
      // Chefs must go through the comprehensive Chef Application / Verification workflow
      router.push("/apply");
      return;
    }

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
        // Upsert profile record safely
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "client",
          });
        } catch (_) {}

        // Attempt instant sign in with the new credentials
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInData?.session) {
          setSuccessMessage("Account created successfully! Loading your dashboard...");
          window.location.href = "/dashboard";
          return;
        }

        // If email confirmation is required or auto-session wasn't created, smoothly switch to the sign in tab
        setMode("signin");
        setSuccessMessage(
          "Account successfully created! Please sign in with your email and password below."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
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
        setError(resetError.message || "Failed to send reset link. Please check your email address.");
      } else {
        setSuccessMessage(
          "Password reset link sent! Check your inbox (and spam folder) at " + email.trim() + " for the link to reset your password."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-10 px-8 sm:px-12 shadow-2xl shadow-forest-950/10 rounded-[36px] border border-forest-100 text-left space-y-6">
      {/* 1. Select Account Persona (Diner vs Chef vs Admin) */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-forest-500 mb-2">
          Step 1: Select Account Type
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedRole("client");
              setError(null);
            }}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
              selectedRole === "client"
                ? "bg-forest-900 text-white border-forest-900 shadow-md ring-2 ring-forest-900/20"
                : "bg-cream-50 hover:bg-cream-100 text-forest-900 border-forest-100"
            }`}
          >
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                selectedRole === "client" ? "bg-white/20 text-white" : "bg-forest-100 text-forest-900"
              }`}
            >
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-tight">Client / Diner</span>
              <span
                className={`text-[10px] ${
                  selectedRole === "client" ? "text-cream-200" : "text-forest-500"
                }`}
              >
                Book private chefs
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole("chef");
              setError(null);
            }}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
              selectedRole === "chef"
                ? "bg-forest-900 text-white border-forest-900 shadow-md ring-2 ring-forest-900/20"
                : "bg-cream-50 hover:bg-cream-100 text-forest-900 border-forest-100"
            }`}
          >
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                selectedRole === "chef" ? "bg-white/20 text-white" : "bg-forest-100 text-forest-900"
              }`}
            >
              <ChefHat className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-tight">Private Chef</span>
              <span
                className={`text-[10px] ${
                  selectedRole === "chef" ? "text-cream-200" : "text-forest-500"
                }`}
              >
                Verified partners
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Sign In vs Register Toggle */}
      {selectedRole === "client" && (
        <div className="flex bg-cream-100 p-1 rounded-2xl border border-forest-100">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              mode === "signin" ? "bg-white text-forest-950 shadow-sm" : "text-forest-600 hover:text-forest-950"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              mode === "signup" ? "bg-white text-forest-950 shadow-sm" : "text-forest-600 hover:text-forest-950"
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* SIGN IN FORM */}
      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="email"
                required
                placeholder={selectedRole === "chef" ? "chef@yourbrand.com" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl shadow-forest-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Sign In as ${selectedRole === "chef" ? "Verified Chef" : "Client"}`
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode("forgot_password"); setError(null); setSuccessMessage(null); }}
              className="text-xs text-forest-500 hover:text-forest-900 underline transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        </form>
      ) : mode === "forgot_password" ? (
        /* FORGOT PASSWORD FORM */
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="p-4 rounded-2xl bg-cream-100/80 border border-forest-100">
            <p className="text-xs font-bold text-forest-950">Password Reset</p>
            <p className="text-[11px] text-forest-600 mt-0.5">Enter your registered email address. We'll send you a secure link to reset your password.</p>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl shadow-forest-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link →"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setSuccessMessage(null); }}
              className="text-xs text-forest-500 hover:text-forest-900 underline transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        </form>
      ) : (
        /* CLIENT REGISTRATION FORM */
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Full Legal Name *
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="text"
                required
                placeholder="e.g. Wanjiru Mwangi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Phone Number (M-Pesa notifications) *
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="tel"
                required
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-forest-500">
              Create Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-cream-50 border border-forest-100 font-bold text-xs text-forest-950 outline-none focus:ring-2 focus:ring-forest-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl shadow-forest-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Client Account →"}
          </button>
        </form>
      )}

      {/* Chef Notice / Apply redirect */}
      {selectedRole === "chef" && (
        <div className="p-4 rounded-2xl bg-cream-100 border border-forest-100 text-xs space-y-2">
          <p className="font-bold text-forest-950">Not yet registered as a Chef Partner?</p>
          <p className="text-forest-600 text-[11px] leading-relaxed">
            All private chefs must submit an application and pass food safety background verification before gaining access.
          </p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-1 font-black text-champagne-700 hover:text-forest-900 underline"
          >
            Submit Chef Application →
          </Link>
        </div>
      )}

      {/* Admin Access Footer Link */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            setSelectedRole("admin");
            setMode("signin");
          }}
          className="text-[10px] text-forest-400 hover:text-forest-900 transition-colors"
        >
          Super Admin Console Login
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="flex items-center text-xs font-black uppercase tracking-widest text-forest-600 hover:text-forest-950 transition-colors"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center gap-2.5 justify-center">
          <div className="h-10 w-10 rounded-2xl bg-forest-900 flex items-center justify-center text-cream-100 shadow-lg">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-2xl font-serif font-bold tracking-tight text-forest-950">
            Book A <span className="text-champagne-600 italic">Chef</span>
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-forest-950 tracking-tight">
          Account Sign In
        </h1>
        <p className="text-xs sm:text-sm text-forest-600 font-medium">
          Choose your account type to access your private dining reservations or chef kitchen portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-white py-12 px-6 shadow-2xl rounded-3xl border border-forest-100 flex justify-center">
              <Loader2 className="h-8 w-8 text-forest-900 animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
