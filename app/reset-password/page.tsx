"use client";

/**
 * Password recovery landing page.
 *
 * Supabase delivers the recovery link with a session (implicit flow: tokens in
 * the URL hash; PKCE flow: `?code=`). This page finishes that handshake, then
 * lets the user set a new password. Previously the link pointed at /dashboard,
 * so the reset token was consumed but no password could be changed.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChefHat, ChevronLeft, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Phase = "checking" | "ready" | "expired" | "saving" | "done";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      const supabase = createClient();

      // PKCE recovery links arrive as ?code=... and must be exchanged.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setPhase("expired");
          return;
        }
      }

      // Implicit links (#access_token=...) are picked up by the Supabase
      // client itself, but the parse is asynchronous, so give it one tick.
      let session = (await supabase.auth.getSession()).data.session;

      if (!session) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) session = (await supabase.auth.getSession()).data.session;
      }

      if (cancelled) return;
      setPhase(session ? "ready" : "expired");
    }

    const timer = window.setTimeout(establishSession, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPhase("saving");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message || "Could not update your password.");
        setPhase("ready");
        return;
      }

      // Route to the surface that matches the account's role.
      let role: string | null = null;
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        role = profile?.role ?? null;
      }

      setPhase("done");
      const home = role === "admin" ? "/admin" : role === "chef" ? "/chef-dashboard" : "/dashboard";
      window.setTimeout(() => {
        window.location.href = home;
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setPhase("ready");
    }
  }

  const inputClass =
    "w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <div className="px-4 sm:px-6 py-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-forest-600 hover:text-forest-950 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-forest-100 p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-forest-950 flex items-center justify-center">
                  <ChefHat className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-forest-950">Book A Chef</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
                {phase === "expired" ? "Link expired" : phase === "done" ? "Password updated" : "Set a new password"}
              </h1>
              <p className="mt-1.5 text-sm text-forest-500">
                {phase === "checking" && "Verifying your reset link…"}
                {phase === "ready" && "Choose a new password for your account."}
                {phase === "saving" && "Saving your new password…"}
                {phase === "done" && "Redirecting you to your account…"}
                {phase === "expired" && "This reset link is invalid or has already been used."}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {phase === "checking" && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
              </div>
            )}

            {phase === "expired" && (
              <div className="space-y-4">
                <p className="text-sm text-forest-500 text-center">
                  Reset links can only be used once. Request a fresh one and open it on this device.
                </p>
                <Link
                  href="/login"
                  className="block w-full py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors text-center"
                >
                  Request a new link
                </Link>
              </div>
            )}

            {phase === "done" && (
              <div className="text-center py-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                <p className="text-sm text-forest-500">You can now use your new password to sign in.</p>
              </div>
            )}

            {(phase === "ready" || phase === "saving") && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-forest-950 mb-1.5">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-950 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={phase === "saving"}
                  className="w-full py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {phase === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
