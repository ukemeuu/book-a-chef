"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, Utensils, ChefHat, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsLoggedIn(true);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          setUserRole(profile?.role || (user.user_metadata?.role as string) || "client");
        } else {
          setIsLoggedIn(false);
          setUserRole(null);
        }
      } catch {
        setIsLoggedIn(false);
        setUserRole(null);
      }
    }
    checkAuth();
  }, [pathname, supabase]);

  // Hide mobile bottom dock on admin pages to maximize workspace
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    {
      label: "Explore",
      href: "/chefs",
      icon: Search,
      active: pathname === "/" || pathname === "/chefs",
    },
    {
      label: "Concierge",
      href: "https://wa.me/254786530713?text=Hi%20Book%20A%20Chef%20Concierge,%20I'd%20like%20to%20inquire%20about%20a%20private%20dining%20experience.",
      icon: Utensils,
      active: false,
    },
    {
      label: userRole === "chef" ? "My Kitchen" : "For Chefs",
      href: userRole === "chef" ? "/chef-dashboard" : "/apply",
      icon: ChefHat,
      active: pathname === "/chef-dashboard" || pathname === "/apply" || pathname === "/chef-jobs",
    },
    {
      label: isLoggedIn ? (userRole === "admin" ? "Admin" : "Kitchen") : "Portal",
      href: isLoggedIn ? (userRole === "admin" ? "/admin" : userRole === "chef" ? "/chef-dashboard" : "/admin") : "/login",
      icon: User,
      active: pathname === "/login" || pathname === "/admin" || pathname === "/chef-dashboard",
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-forest-100/80 px-4 py-2 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                isActive
                  ? "text-forest-950 font-bold"
                  : "text-forest-500 font-medium hover:text-forest-800"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    isActive ? "stroke-[2.5] scale-110 text-forest-900" : "stroke-[1.75]"
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-champagne-600 rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
