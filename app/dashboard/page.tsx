"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Loader2,
  Heart,
  LogOut,
  Phone,
  MapPin,
  Star,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  MarketplaceChef,
  chefCover,
  chefTelUrl,
  formatPhone,
} from "@/utils/marketplace";
import { createClient } from "@/utils/supabase/client";

/**
 * Customer account page.
 *
 * This is a directory, so there are no bookings, messages, or payments here.
 * Customers save chefs they like and contact them directly.
 */
export default function ClientDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [favouriteChefs, setFavouriteChefs] = useState<MarketplaceChef[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function initDashboard() {
      setLoading(true);
      try {
        const {
          data: { user: authUser },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !authUser) {
          router.push("/login?redirect=/dashboard");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          router.replace("/admin");
          return;
        }
        if (profile?.role === "chef") {
          router.replace("/chef-dashboard");
          return;
        }

        setUser(authUser);

        const { data: favRows } = await supabase
          .from("chef_favorites")
          .select("chef_id, chefs(*)")
          .eq("client_id", authUser.id)
          .order("created_at", { ascending: false });

        if (favRows && favRows.length > 0) {
          setFavouriteChefs(
            favRows
              .map((f: any) => f.chefs)
              .filter(Boolean)
              .map((c: any) => ({
                ...c,
                menus: [],
              }))
          );
        }
      } catch (err) {
        console.error("Dashboard initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [supabase, router]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 pt-24 pb-16 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-forest-950 text-white flex items-center justify-center text-xl font-bold uppercase">
              {(user?.user_metadata?.full_name || user?.email || "U").charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Welcome"}
              </h1>
              <p className="text-forest-500 text-sm mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-forest-200 text-sm font-medium text-forest-700 hover:bg-cream-50 transition-colors self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        {/* Favourites */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-forest-950">
              My favourite chefs
            </h2>
            <Link
              href="/chefs"
              className="inline-flex items-center gap-1 text-sm font-medium text-forest-600 hover:text-forest-950 transition-colors"
            >
              Browse directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {favouriteChefs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favouriteChefs.map((chef) => {
                const telUrl = chefTelUrl(chef.phone);
                return (
                  <div
                    key={chef.id}
                    className="bg-white rounded-2xl border border-forest-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    <Link
                      href={`/chefs/${chef.slug}`}
                      className="relative aspect-[16/9] bg-forest-950 overflow-hidden"
                    >
                      <Image
                        src={chefCover(chef)}
                        alt={chef.name}
                        fill
                        className="object-cover"
                      />
                    </Link>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/chefs/${chef.slug}`}
                          className="font-bold text-forest-950 truncate hover:text-forest-700 transition-colors"
                        >
                          {chef.name}
                        </Link>
                        {chef.verified && (
                          <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-forest-500 truncate mt-0.5">
                        {chef.cuisines?.slice(0, 3).join(" • ")}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-forest-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {chef.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-champagne-500 fill-current" />
                          {Number(chef.rating || 0).toFixed(1)}
                        </span>
                      </div>
                      {chef.phone && telUrl && (
                        <a
                          href={telUrl}
                          className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-bold hover:bg-forest-800 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          {formatPhone(chef.phone)}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-forest-100 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-forest-400" />
              </div>
              <h3 className="text-lg font-bold text-forest-950 mb-1">
                No favourites yet
              </h3>
              <p className="text-sm text-forest-500 mb-6 max-w-sm mx-auto">
                Save chefs you like and they&apos;ll appear here for quick
                access.
              </p>
              <Link
                href="/chefs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
              >
                <ChefHat className="h-4 w-4" />
                Browse chefs
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
