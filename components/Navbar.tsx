"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  Search,
  User,
  Menu as MenuIcon,
  X,
  Sparkles,
  LogOut,
  LayoutDashboard,
  Shield,
  Utensils,
  LogIn,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState<"client" | "chef" | "admin" | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", user.id)
            .single();

          setUserRole(profile?.role || (user.user_metadata?.role as any) || "client");
          setUserName(profile?.full_name || user.user_metadata?.full_name || null);
        } else {
          setUserRole(null);
          setUserEmail(null);
          setUserName(null);
        }
      } catch (err) {
        setUserRole(null);
        setUserEmail(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname, supabase]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUserRole(null);
    setUserEmail(null);
    setUserName(null);
    setProfileDropdownOpen(false);
    router.push("/login");
  };

  const isHome = pathname === "/";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || !isHome
          ? "bg-cream-50/95 backdrop-blur-md border-b border-forest-100/60 shadow-sm py-3.5"
          : "bg-gradient-to-b from-forest-950/70 via-forest-950/30 to-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
                scrolled || !isHome
                  ? "bg-forest-900 text-cream-100 shadow-md shadow-forest-900/20 group-hover:bg-forest-800"
                  : "bg-cream-100 text-forest-900 shadow-lg group-hover:scale-105"
              }`}
            >
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span
                className={`font-serif text-xl font-bold tracking-tight leading-none ${
                  scrolled || !isHome ? "text-forest-950" : "text-white"
                }`}
              >
                Book A <span className="text-champagne-500 italic">Chef</span>
              </span>
              <span
                className={`text-[9px] font-black uppercase tracking-[0.25em] mt-0.5 ${
                  scrolled || !isHome ? "text-forest-600" : "text-cream-200/80"
                }`}
              >
                Private Dining
              </span>
            </div>
          </Link>

          {/* Airbnb-style Middle Pill for Quick Search */}
          <div
            className={`hidden md:flex items-center bg-white rounded-full border border-forest-100 p-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
              scrolled || !isHome ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            onClick={() => router.push("/chefs")}
          >
            <span className="text-xs font-bold text-forest-900 px-3.5 border-r border-forest-100">
              Anywhere in Kenya
            </span>
            <span className="text-xs font-bold text-forest-900 px-3.5 border-r border-forest-100">
              Any Date
            </span>
            <span className="text-xs font-medium text-forest-500 px-3.5">
              Add Guests
            </span>
            <div className="h-8 w-8 rounded-full bg-forest-900 text-cream-50 flex items-center justify-center ml-1">
              <Search className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/chefs"
              className={`hidden lg:inline-flex text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-full transition-all ${
                scrolled || !isHome
                  ? "text-forest-800 hover:text-forest-950 hover:bg-forest-50"
                  : "text-cream-100 hover:text-white hover:bg-white/10"
              }`}
            >
              Find Chefs
            </Link>

            <Link
              href="/request"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-full bg-champagne-400 hover:bg-champagne-300 text-forest-950 transition-all shadow-md active:scale-95"
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span>Request a Chef</span>
            </Link>

            <Link
              href="/apply"
              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all ${
                scrolled || !isHome
                  ? "text-forest-900 bg-cream-200/80 hover:bg-cream-300/80"
                  : "text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm"
              }`}
            >
              <Sparkles className="h-3 w-3 text-champagne-400" />
              Become a Chef
            </Link>

            {/* Account & Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2 p-1.5 pl-3 rounded-full border transition-all ${
                  scrolled || !isHome
                    ? "bg-white border-forest-100 hover:shadow-md text-forest-900"
                    : "bg-white/15 border-white/25 text-white hover:bg-white/25 backdrop-blur-md"
                }`}
                aria-label="User menu"
              >
                <MenuIcon className="h-4 w-4" />
                <div className="h-7 w-7 rounded-full bg-forest-900 text-cream-100 flex items-center justify-center text-xs font-black uppercase">
                  {userEmail ? userEmail.charAt(0) : <User className="h-3.5 w-3.5" />}
                </div>
              </button>

              {/* Secure Profile Dropdown (Production-ready: Only authentic user options) */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-3xl bg-white shadow-2xl border border-forest-100 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {userEmail ? (
                    /* Authenticated State */
                    <div className="space-y-2">
                      <div className="p-3 bg-cream-100 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                          Signed in as
                        </p>
                        <p className="text-xs font-bold text-forest-950 truncate mt-0.5">
                          {userName || userEmail}
                        </p>
                        <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-900 text-cream-50">
                          {userRole === "admin" ? "Super Admin" : userRole === "chef" ? "Verified Chef" : "Client Diner"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {userRole === "admin" && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                          >
                            <Shield className="h-4 w-4 text-champagne-600" />
                            Admin Console
                          </Link>
                        )}

                        {userRole === "chef" && (
                          <Link
                            href="/chef-dashboard"
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                          >
                            <ChefHat className="h-4 w-4 text-forest-700" />
                            Chef Kitchen Portal
                          </Link>
                        )}

                        {userRole === "client" && (
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4 text-forest-700" />
                            My Reservations
                          </Link>
                        )}

                        <Link
                          href="/chefs"
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                        >
                          <Utensils className="h-4 w-4 text-forest-700" />
                          Browse Chefs
                        </Link>
                      </div>

                      <div className="h-px bg-forest-100 my-1" />

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    /* Guest State */
                    <div className="space-y-1">
                      <a
                        href="https://wa.me/254786530713?text=Hi%20Book%20A%20Chef%20Concierge,%20I'd%20like%20to%20inquire%20about%20a%20private%20dining%20experience."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-forest-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition-all text-center justify-center shadow-md"
                      >
                        <Sparkles className="h-4 w-4 text-champagne-400" />
                        Dining Concierge
                      </a>

                      <Link
                        href="/request"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-forest-950 bg-champagne-100 hover:bg-champagne-200 transition-colors"
                      >
                        <ChefHat className="h-4 w-4 text-forest-900" />
                        <span>Request a Chef (Uber Match)</span>
                      </Link>

                      <Link
                        href="/request/status"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                      >
                        <Sparkles className="h-4 w-4 text-champagne-600" />
                        <span>Track Live Booking</span>
                      </Link>

                      <Link
                        href="/chefs"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                      >
                        <Search className="h-4 w-4 text-forest-600" />
                        Explore Our Chefs
                      </Link>

                      <Link
                        href="/apply"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-forest-900 hover:bg-forest-50 transition-colors"
                      >
                        <ChefHat className="h-4 w-4 text-champagne-600" />
                        Apply as a Private Chef
                      </Link>

                      <div className="h-px bg-forest-100 my-1" />

                      <Link
                        href="/login"
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-[11px] font-semibold text-forest-500 hover:bg-forest-50 hover:text-forest-900 transition-colors"
                      >
                        <LogIn className="h-3.5 w-3.5 text-forest-400" />
                        Admin & Chef Portal
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl ${
                scrolled || !isHome ? "text-forest-900" : "text-white"
              }`}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 p-4 rounded-3xl bg-white border border-forest-100 shadow-2xl space-y-3 text-left">
            <Link
              href="/request"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-champagne-400 text-forest-950 font-black text-sm shadow-md"
            >
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                <span>Request a Chef</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider bg-forest-950 text-cream-50 px-2 py-0.5 rounded-full font-bold">
                Uber Match
              </span>
            </Link>

            <Link
              href="/request/status"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-cream-100 text-forest-950 font-bold text-sm"
            >
              <span>Track Live Booking</span>
              <Sparkles className="h-4 w-4 text-champagne-600" />
            </Link>

            <Link
              href="/chefs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-cream-100 text-forest-950 font-bold text-sm"
            >
              <span>Browse Private Chefs</span>
              <Search className="h-4 w-4 text-forest-700" />
            </Link>

            <Link
              href="/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-forest-900 text-cream-50 font-bold text-sm"
            >
              <span>Apply to Cook</span>
              <Sparkles className="h-4 w-4 text-champagne-400" />
            </Link>

            <div className="h-px bg-forest-100 my-2" />

            {userEmail ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-forest-500 px-1">Signed in as {userEmail}</p>
                {userRole === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block p-2.5 rounded-xl bg-forest-50 text-xs font-bold text-forest-900"
                  >
                    Admin Console
                  </Link>
                )}
                {userRole === "chef" && (
                  <Link
                    href="/chef-dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block p-2.5 rounded-xl bg-forest-50 text-xs font-bold text-forest-900"
                  >
                    Chef Dashboard
                  </Link>
                )}
                {userRole === "client" && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block p-2.5 rounded-xl bg-forest-50 text-xs font-bold text-forest-900"
                  >
                    Client Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center p-3 rounded-2xl bg-forest-900 text-white font-bold text-xs uppercase tracking-wider"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
