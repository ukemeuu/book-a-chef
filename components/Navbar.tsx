"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  Menu as MenuIcon,
  X,
  LogOut,
  LayoutDashboard,
  Shield,
  LogIn,
  User,
  Globe,
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

  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function checkAuth() {
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
          setUserRole(profile?.role || "client");
          setUserName(profile?.full_name || user.user_metadata?.full_name || null);
        } else {
          setUserRole(null);
          setUserEmail(null);
          setUserName(null);
        }
      } catch {
        setUserRole(null);
        setUserEmail(null);
      }
    }
    checkAuth();
  }, [pathname, supabase]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUserRole(null);
    setUserEmail(null);
    setUserName(null);
    setProfileDropdownOpen(false);
    router.push("/");
  };

  // Login page has its own minimal header
  if (pathname === "/login") return null;

  const isHome = pathname === "/";
  const solid = scrolled || !isHome;

  const dashboardHref =
    userRole === "admin"
      ? "/admin"
      : userRole === "chef"
      ? "/chef-dashboard"
      : "/dashboard";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solid
          ? "bg-white/95 backdrop-blur-md border-b border-forest-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-all ${
            solid ? "h-16" : "h-20"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <ChefHat className={`h-5 w-5 ${solid ? "text-forest-950" : "text-white"}`} />
            <span
              className={`font-bold tracking-tight ${
                solid ? "text-forest-950 text-base" : "text-white text-lg"
              }`}
            >
              Book A Chef
            </span>
          </Link>

          {/* Center nav — desktop */}
          <nav
            className={`hidden md:flex items-center gap-1 text-sm font-medium ${
              solid ? "text-forest-600" : "text-cream-100/90"
            }`}
          >
            <Link href="/request" className="px-3 py-2 hover:opacity-100 transition-opacity">
              Request a chef
            </Link>
            {/* Tracking lives behind an account — only show once signed in. */}
            {userEmail && (
              <Link href="/request/status" className="px-3 py-2 hover:opacity-100 transition-opacity">
                Track booking
              </Link>
            )}
            <Link href="/chef-jobs" className="px-3 py-2 hover:opacity-100 transition-opacity">
              Cook with us
            </Link>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/request"
              className={`hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                solid
                  ? "bg-forest-950 text-white hover:bg-forest-800"
                  : "bg-white text-forest-950 hover:bg-cream-100"
              }`}
            >
              <ChefHat className="h-4 w-4" />
              Request a Chef
            </Link>

            {/* Profile */}
            {userEmail ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`flex items-center gap-2 p-1 pl-3 rounded-full border transition-colors ${
                    solid
                      ? "bg-white border-forest-200 hover:bg-cream-50"
                      : "bg-white/15 border-white/25 text-white hover:bg-white/25 backdrop-blur-md"
                  }`}
                  aria-label="Account menu"
                >
                  <MenuIcon className="h-4 w-4" />
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${
                      solid ? "bg-forest-950 text-white" : "bg-white text-forest-950"
                    }`}
                  >
                    {(userName || userEmail).charAt(0)}
                  </span>
                </button>

                {profileDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-forest-100 overflow-hidden z-50"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <div className="p-3 border-b border-forest-100">
                      <p className="text-xs font-medium text-forest-950 truncate">
                        {userName || userEmail}
                      </p>
                      <p className="text-[11px] text-forest-500 capitalize">{userRole}</p>
                    </div>
                    <Link
                      href={dashboardHref}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-forest-800 hover:bg-cream-50 transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {userRole === "admin" ? "Admin" : userRole === "chef" ? "Chef dashboard" : "My bookings"}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-forest-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className={`flex items-center gap-2 p-2 rounded-full border transition-colors ${
                  solid
                    ? "border-forest-200 hover:bg-cream-50 text-forest-900"
                    : "border-white/25 text-white hover:bg-white/15 backdrop-blur-md"
                }`}
                aria-label="Sign in"
              >
                <User className="h-4 w-4" />
              </Link>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 -mr-2 ${solid ? "text-forest-950" : "text-white"}`}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-forest-100 bg-white">
            <nav className="flex flex-col">
              <Link
                href="/request"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-forest-950 border-b border-forest-100"
              >
                Request a chef
              </Link>
              {userEmail && (
                <Link
                  href="/request/status"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 text-sm font-medium text-forest-950 border-b border-forest-100"
                >
                  Track booking
                </Link>
              )}
              <Link
                href="/chef-jobs"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-forest-950 border-b border-forest-100"
              >
                Cook with us
              </Link>

              <div className="pt-3 mt-1">
                {userEmail ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-3 text-sm font-medium text-forest-950"
                    >
                      {userRole === "admin" ? "Admin" : userRole === "chef" ? "Chef dashboard" : "My bookings"}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="block py-3 text-sm font-medium text-red-600"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 text-sm font-medium text-forest-950"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}