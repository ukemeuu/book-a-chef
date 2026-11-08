"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  MapPin,
  BadgeCheck,
  Heart,
  Share2,
  Home,
  Truck,
  Clock,
  Calendar,
  ArrowRight,
  Phone,
  MessageCircle,
  ShieldCheck,
  Award,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MenuCard from "@/components/chef/MenuCard";
import ReviewCard from "@/components/chef/ReviewCard";
import AvailabilityCalendar from "@/components/chef/AvailabilityCalendar";
import {
  MarketplaceChef,
  MarketplaceReview,
  ChefAvailability,
  BlockedDate,
  formatPrice,
  serviceFormatLabel,
  DAY_NAMES,
} from "@/utils/marketplace";
import { createClient } from "@/utils/supabase/client";

interface ChefProfileClientProps {
  chef: MarketplaceChef;
  reviews: MarketplaceReview[];
  availability: ChefAvailability | null;
  blockedDates: BlockedDate[];
  busyDates: string[];
}

export default function ChefProfileClient({
  chef,
  reviews,
  availability,
  blockedDates,
  busyDates,
}: ChefProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavLoading, setIsFavLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Check favourite state.
  useEffect(() => {
    async function checkFav() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("chef_favorites")
        .select("id")
        .eq("client_id", user.id)
        .eq("chef_id", chef.id)
        .maybeSingle();

      setIsFavorite(!!data);
    }
    checkFav();
  }, [chef.id, supabase]);

  const toggleFavorite = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirect=/chefs/${chef.slug}`);
      return;
    }

    setIsFavLoading(true);
    setIsFavorite((prev) => !prev);

    try {
      await fetch(`/api/chefs/${chef.slug}/favorite`, { method: "POST" });
    } catch {
      setIsFavorite((prev) => !prev);
    } finally {
      setIsFavLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — no-op.
    }
  };

  const cover = chef.cover_image_url || chef.avatar_url;
  const gallery = (chef.gallery_images || []).filter(Boolean);

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* ── COVER ── */}
        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-cream-100 mb-6">
          <Image
            src={cover}
            alt={chef.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-forest-950/40 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* ── HEADER CARD ── */}
        <div className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0 -mt-16 sm:-mt-12 bg-cream-100">
              <Image
                src={chef.avatar_url}
                alt={chef.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
                  {chef.name}
                </h1>
                {chef.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              {chef.brand_name && (
                <p className="text-sm text-forest-500 mt-0.5">
                  {chef.brand_name}
                </p>
              )}
              {chef.tagline && (
                <p className="text-base text-forest-700 mt-2">{chef.tagline}</p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-champagne-500 fill-current" />
                  <span className="font-bold text-forest-950">
                    {Number(chef.rating || 0).toFixed(1)}
                  </span>
                  {chef.reviews_count > 0 && (
                    <span className="text-forest-400">
                      ({chef.reviews_count} review
                      {chef.reviews_count === 1 ? "" : "s"})
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-forest-600">
                  <MapPin className="h-4 w-4" />
                  {chef.city}
                </span>
                {chef.experience_years > 0 && (
                  <span className="flex items-center gap-1.5 text-forest-600">
                    <Award className="h-4 w-4" />
                    {chef.experience_years}+ years
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    chef.is_available
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-cream-100 text-forest-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      chef.is_available ? "bg-emerald-500 animate-pulse" : "bg-forest-300"
                    }`}
                  />
                  {chef.is_available ? "Available now" : "Not available"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:bg-cream-50 transition-colors"
                aria-label="Share profile"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFavorite}
                disabled={isFavLoading}
                className="w-10 h-10 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:bg-cream-50 transition-colors disabled:opacity-50"
                aria-label="Save chef"
              >
                <Heart
                  className={`h-4 w-4 ${
                    isFavorite ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {shareCopied && (
            <p className="mt-3 text-xs text-emerald-700 font-medium">
              Link copied to clipboard
            </p>
          )}
        </div>

        {/* ── BOOKING CTA ── */}
        <div className="bg-forest-950 rounded-2xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-400 mb-1">
                Book {chef.name.split(" ")[0]}
              </p>
              <p className="text-2xl font-bold">
                {formatPrice(chef.price_per_guest)}
                <span className="text-sm font-normal text-cream-200/70">
                  {" "}
                  per guest
                </span>
              </p>
              <p className="text-xs text-cream-200/60 mt-1">
                {chef.min_guests}–{chef.max_guests} guests •{" "}
                {chef.service_formats
                  ?.map(serviceFormatLabel)
                  .join(" & ") || "In-home dining"}
              </p>
            </div>
            <Link
              href={`/book/${chef.slug}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-sm transition-all active:scale-95 shadow-lg"
            >
              Book this chef
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ── ABOUT ── */}
        <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-forest-950 mb-3">About</h2>
          <p className="text-sm text-forest-700 leading-relaxed whitespace-pre-line">
            {chef.bio || "This chef has not added a bio yet."}
          </p>
          {chef.culinary_philosophy && (
            <blockquote className="mt-4 pl-4 border-l-2 border-champagne-400 text-sm text-forest-600 italic">
              &ldquo;{chef.culinary_philosophy}&rdquo;
            </blockquote>
          )}
        </section>

        {/* ── DETAILS ── */}
        <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-forest-950 mb-4">Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-1">
                Cuisines
              </p>
              <div className="flex flex-wrap gap-1">
                {chef.cuisines?.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-full bg-cream-100 text-forest-700 text-xs font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-1">
                Dietary
              </p>
              <div className="flex flex-wrap gap-1">
                {chef.dietary_specialties?.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 text-xs font-medium"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-1">
                Service areas
              </p>
              <p className="text-sm text-forest-700">
                {chef.service_areas?.slice(0, 4).join(", ")}
                {(chef.service_areas?.length || 0) > 4 && "…"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-1">
                Service formats
              </p>
              <div className="flex flex-col gap-1">
                {chef.allow_in_home && (
                  <span className="flex items-center gap-1.5 text-sm text-forest-700">
                    <Home className="h-3.5 w-3.5 text-forest-500" />
                    In-home dining
                  </span>
                )}
                {chef.allow_delivery && (
                  <span className="flex items-center gap-1.5 text-sm text-forest-700">
                    <Truck className="h-3.5 w-3.5 text-forest-500" />
                    Cooked &amp; delivered
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-1">
                Notice required
              </p>
              <p className="flex items-center gap-1.5 text-sm text-forest-700">
                <Clock className="h-3.5 w-3.5 text-forest-500" />
                {chef.min_notice_hours || 48} hours
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-1">
                Guest range
              </p>
              <p className="flex items-center gap-1.5 text-sm text-forest-700">
                <Calendar className="h-3.5 w-3.5 text-forest-500" />
                {chef.min_guests}–{chef.max_guests} guests
              </p>
            </div>
          </div>
        </section>

        {/* ── GALLERY ── */}
        {gallery.length > 0 && (
          <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              Gallery
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-cream-100"
                >
                  <Image
                    src={src}
                    alt={`${chef.name} dish ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MENUS ── */}
        {chef.menus?.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">Menus</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chef.menus.map((menu) => (
                <MenuCard key={menu.id} menu={menu} />
              ))}
            </div>
          </section>
        )}

        {/* ── AVAILABILITY ── */}
        <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-forest-950 mb-4">
            Availability
          </h2>
          <AvailabilityCalendar
            availability={availability}
            blockedDates={blockedDates}
            busyDates={busyDates}
          />
        </section>

        {/* ── REVIEWS ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-forest-950">
              Reviews{" "}
              {chef.reviews_count > 0 && (
                <span className="text-sm font-normal text-forest-400">
                  ({chef.reviews_count})
                </span>
              )}
            </h2>
          </div>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-forest-100 p-8 text-center">
              <p className="text-sm text-forest-500">
                No reviews yet. Be the first to book {chef.name.split(" ")[0]}{" "}
                and leave a review.
              </p>
            </div>
          )}
        </section>

        {/* ── TRUST ── */}
        <section className="bg-forest-50 rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-sm font-bold text-forest-950 mb-4">
            Book with confidence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "Verified chef",
                desc: "ID-checked, background-cleared, and kitchen-tasted by our team.",
              },
              {
                icon: Calendar,
                title: "Escrow payment",
                desc: "Your payment is held securely until the chef accepts your booking.",
              },
              {
                icon: MessageCircle,
                title: "Direct contact",
                desc: "Connect with your chef on WhatsApp to confirm the details.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 border border-forest-100">
                  <item.icon className="h-4 w-4 text-forest-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-forest-950">
                    {item.title}
                  </p>
                  <p className="text-xs text-forest-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STICKY CTA (mobile) ── */}
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-forest-100 p-4 z-40">
          <Link
            href={`/book/${chef.slug}`}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm"
          >
            Book {chef.name.split(" ")[0]}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
